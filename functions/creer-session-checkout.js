const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const allowedOrigins = [
    "https://encompagniedesetoiles.fr",
    "https://www.encompagniedesetoiles.fr"
  ];

  const origin = event.headers.origin || "";
  const isAllowedOrigin =
    allowedOrigins.includes(origin) ||
    origin.startsWith("https://deploy-preview");

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

  const baseUrl = process.env.URL_SITE;

  try {
    const { panier } = JSON.parse(event.body);

    // --- 1) Séparer cartes / autres produits ---
    let cardTotal = 0;
    let otherTotal = 0;

    panier.forEach(item => {
      const subtotal = item.prix * item.quantite;
      if (item.categorie === "carte") {
        cardTotal += subtotal;
      } else {
        otherTotal += subtotal;
      }
    });

    // --- 2) Réduction cartes ---
    let cardDiscount = 0;
    if (cardTotal >= 10) {
      cardDiscount = cardTotal * 0.15;
    }
    const cardTotalAfterDiscount = cardTotal - cardDiscount;

    // --- 3) Frais de port ---
    let shippingCost = 2;
    const totalBeforeShipping = cardTotalAfterDiscount + otherTotal;

    if (otherTotal > 0 || totalBeforeShipping >= 10) {
      shippingCost = 0;
    }

    // --- 4) Construire les line_items détaillés ---
    const line_items = [];

    panier.forEach(item => {
      const isCard = item.categorie === "carte";

      // prix unitaire après réduction éventuelle
      let unitPrice = item.prix;

      if (isCard && cardDiscount > 0) {
        const reductionFactor = (cardTotal - cardDiscount) / cardTotal;
        unitPrice = unitPrice * reductionFactor;
      }

      line_items.push({
        quantity: item.quantite,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(unitPrice * 100),
          product_data: {
            name: item.nom,
            images: [item.image]
          }
        }
      });
    });

    // --- 5) Ajouter les frais de port si nécessaires ---
		if (shippingCost > 0) {
			line_items.push({
				quantity: 1,
				price_data: {
					currency: "eur",
					unit_amount: shippingCost * 100,
					product_data: {
						name: "Frais de port"
					}
				}
			});
		} else {
			line_items.push({
				quantity: 1,
				price_data: {
					currency: "eur",
					unit_amount: 0,
					product_data: {
						name: "Frais de port — Offerts"
					}
				}
			});
		}


    // --- 6) Créer la session Stripe ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_creation: "always",
      line_items,
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cancel`,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["FR"]
      },
      metadata: {
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
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": isAllowedOrigin
          ? origin
          : "https://encompagniedesetoiles.fr"
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
