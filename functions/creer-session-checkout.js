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

  const baseUrl = process.env.URL_SITE;

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
      if (!item.priceId?.startsWith("price_") || !Number.isInteger(item.quantite) || item.quantite < 1) {
        return { statusCode: 400, body: JSON.stringify({ error: "Article invalide" }) };
      }

      const price = await stripe.prices.retrieve(item.priceId);
      const sousTotal = price.unit_amount * item.quantite; // en centimes

      if (item.categorie === "carte") {
        totalCartes += sousTotal;
      } else if (item.categorie === "tableaux_origami") {
        totalOrigami += sousTotal;
      } else {
        totalAutres += sousTotal;
      }

      line_items.push({ price: item.priceId, quantity: item.quantite });
    }

    // --- 2) Réductions (mêmes règles que calculerTotaux, en centimes) ---
    const SEUIL_FRAIS_DE_PORT = 10_00;   // 10,00 €
    const SEUIL_CARTES = 10_00;          // 10,00 €
    const SEUIL_ORIGAMI = 250_00;        // strictement supérieur
    const TAUX = 0.15;

    const reductionCartes = totalCartes >= SEUIL_CARTES ? Math.round(totalCartes * TAUX) : 0;
    const reductionOrigami = totalOrigami > SEUIL_ORIGAMI ? Math.round(totalOrigami * TAUX) : 0;

    // --- 2bis) Remises sous forme de lignes négatives ---
    if (reductionCartes > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: -reductionCartes, // négatif = remise
          product_data: { name: "Réduction cartes (-15 %)" }
        }
      });
    }
    if (reductionOrigami > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: -reductionOrigami,
          product_data: { name: "Réduction tableaux (-15 %)" }
        }
      });
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
      line_items,
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cancel`,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["FR"] },
      metadata: {
        nom: client.nom,
        prenom: client.prenom,
        email: client.email,
        adresse: client.adresse,
        complement: client.complement || "",
        codePostal: client.codePostal || "",
        ville: client.ville || "",
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