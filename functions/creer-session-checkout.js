const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const allowedOrigins = [
    "https://encompagniedesetoiles.fr",
    "https://www.encompagniedesetoiles.fr"
  ];

  const origin = event.headers.origin || "";
  const isAllowedOrigin =
    allowedOrigins.includes(origin) ||
    origin.startsWith("https://deploy-preview") ||
    origin.startsWith("https://refonte--encompagniedesetoiles");

  // --- Préflight CORS ---
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin
          ? origin
          : "https://encompagniedesetoiles.fr",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: "Preflight OK"
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const baseUrl = process.env.URL_SITE; //Paramétré dans Netlify

  try {
    const { panier, client } = JSON.parse(event.body);

    if (!Array.isArray(panier) || panier.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Panier vide" }) };
    }
    if (!client?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email invalide" }) };
    }

    // --- 1) Récupérer les prix AUPRÈS DE STRIPE ---
    // Le panier ne doit contenir que { priceId, quantite, categorie }.
    const line_items = [];
    let totalCartes = 0;
    let totalOrigami = 0;
    let totalAutres = 0;

    for (const item of panier) {
			if (!item.priceIdStripe?.startsWith("price_") || !Number.isInteger(item.quantite) || item.quantite < 1) {
				return { statusCode: 400, body: JSON.stringify({ error: "Article invalide" }) };
			}

      const price = await stripe.prices.retrieve(item.priceIdStripe);
      const sousTotal = price.unit_amount * item.quantite; // en centimes

      if (item.categorie === "carte") {
        totalCartes += sousTotal;
      } else if (item.categorie === "tableau_origami") {
        totalOrigami += sousTotal;
      } else {
        totalAutres += sousTotal;
      }

      line_items.push({ price: item.priceIdStripe, quantity: item.quantite });
    }

    // --- 2) Réductions (mêmes règles que calculerTotaux, en centimes) ---
    const SEUIL_FRAIS_DE_PORT = 10_00;   // 10,00 €
    const SEUIL_CARTES = 10_00;          // 10,00 €
    const SEUIL_ORIGAMI = 250_00;        // strictement supérieur
    const TAUX = 0.15;

    const reductionCartes = totalCartes >= SEUIL_CARTES ? Math.round(totalCartes * TAUX) : 0;
    const reductionOrigami = totalOrigami > SEUIL_ORIGAMI ? Math.round(totalOrigami * TAUX) : 0;


		// --- 2bis) Remise via un coupon à montant fixe créé à la volée ---
		// (Checkout accepte 1 seul coupon : on fusionne cartes + origami)
		const discounts = [];
		const remiseTotale = reductionCartes + reductionOrigami;

		if (remiseTotale > 0) {
			// Libellé explicite pour le reçu
			const libelles = [];
			if (reductionCartes > 0) libelles.push("cartes");
			if (reductionOrigami > 0) libelles.push("tableaux");
			// Stripe accepte des montants négatifs dans le nom, mais pas de "+" vide :
			const nomCoupon = `Réduction -15 % (${libelles.join(" + ")})`;

			const coupon = await stripe.coupons.create({
				amount_off: remiseTotale,   // en centimes
				currency: "eur",
				duration: "once",
				name: nomCoupon
			});
			discounts.push({ coupon: coupon.id });
		}
		
    // --- 3) Frais de port ---
    const totalAvantPort = totalCartes - reductionCartes
                         + totalOrigami - reductionOrigami
                         + totalAutres;
    const fraisPort = totalAvantPort >= SEUIL_FRAIS_DE_PORT ? 0 : 2_00;

		if (fraisPort > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: fraisPort,
          product_data: { name: "Frais de port" }
        }
      });
    }

    // --- 4) Créer la session avec métadonnées client + remises exactes ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_creation: "always",
      customer_email: client.email,

			invoice_creation: {
				enabled: true,
				invoice_data: {
					footer: "Facture acquittée — aucun paiement requis. Le lien éventuellement affiché sur ce document ne nécessite aucune action : cette facture est déjà réglée.\n\n\nThierry AILLERET EI - En Compagnie des Étoiles - 37 rue Lucien Carlier - 59240 DUNKERQUE - SIRET 932 235 237 00017\nTVA non applicable, art. 293 B du CGI",
					metadata: {
						"01_nom": client.nom,
						"02_prenom": client.prenom,
						"03_email": client.email,
						"01_adresse": client.adresse,
						"02_complement": client.complement || "",
						"03_codePostal": client.codePostal || "",
						"04_ville": client.ville || "",
						"05_adresseLivraison": client.adresseLivraison || "",
						"06_complementLivraison": client.complementLivraison || "",
						"07_codePostalLivraison": client.codePostalLivraison || "",
						"08_villeLivraison": client.villeLivraison || "",
						"09_modeLivraison": client.modeLivraison || "poste",
						"10_pointRelais": client.pointRelais || "",
						"11_pointRelaisId": client.pointRelaisId || ""
					}
				}
			},
			

      line_items,
			...(discounts.length > 0 ? { discounts } : []),
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cancel`,
      metadata: {
        nom: client.nom,
        prenom: client.prenom,
        email: client.email,
        adresse: client.adresse,
        complement: client.complement || "",
        codePostal: client.codePostal || "",
        ville: client.ville || "",
				adresseLivraison: client.adresseLivraison || "",
				complementLivraison: client.complementLivraison || "",
				codePostalLivraison: client.codePostalLivraison || "",
				villeLivraison: client.villeLivraison || "",
				modeLivraison: client.modeLivraison || "poste",
				articlesPoste: client.articlesPoste || "",
				articlesRelais: client.articlesRelais || "",
        pointRelais: client.pointRelais || "",
        pointRelaisId: client.pointRelaisId || "",
        environnement: process.env.STRIPE_ENV === "live" ? "live" : "test"
      }
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": isAllowedOrigin
          ? origin
          : "https://encompagniedesetoiles.fr"
      },
      body: JSON.stringify({ sessionId: session.id })
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Control-Allow-Origin": isAllowedOrigin
          ? origin
          : "https://encompagniedesetoiles.fr"
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};