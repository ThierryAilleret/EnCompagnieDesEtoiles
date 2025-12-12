const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const allowedOrigins = [
    "https://encompagniedesetoiles.fr",
    "https://www.encompagniedesetoiles.fr"
  ];

  const origin = event.headers.origin || "";
  const isAllowedOrigin = allowedOrigins.includes(origin) || origin.startsWith("https://deploy-preview");

  // 🔧 Réponse à la requête OPTIONS (préflight CORS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "https://encompagniedesetoiles.fr",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: "Preflight OK"
    };
  }

	const baseUrl = process.env.URL_SITE;
	console.log("Base URL:", baseUrl);
	
  try {
    const { panier, client } = JSON.parse(event.body);
    const isLive = process.env.STRIPE_ENV === "live";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_creation: "always",
      customer_email: client.email,

      line_items: panier.map(item => ({
        price: item.priceIdStripe,
        quantity: item.quantite || 1,
      })),

			success_url: `${baseUrl}/success`,
			cancel_url: `${baseUrl}/cancel`,

      // success_url: "https://encompagniedesetoiles.fr/success",
      // cancel_url: "https://encompagniedesetoiles.fr/cancel",

			// Ajout pour collecter l’adresse 
			billing_address_collection: "required",
			shipping_address_collection: {
				allowed_countries: ["FR"]
			},

      metadata: {
        nomClient: client.nom,
        prenomClient: client.prenom,
        emailClient: client.email,
        adresseClient: client.adresse,
        complement: client.complement,
        nomClientLiv: client.nom_liv,
        prenomClientLiv: client.prenom_liv,
        emailClientLiv: client.email_liv,
        adresseClientLiv: client.adresse_liv,
        complementLiv: client.complement_liv,
        environnement: isLive ? "live" : "test"
      }
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "https://encompagniedesetoiles.fr"
      },
      body: JSON.stringify({ sessionId: session.id })
    };
  } catch (err) {
    console.error("Stripe error:", err);
    console.error("Stack:", err.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "https://encompagniedesetoiles.fr"
      },
      body: JSON.stringify({ error: err.message || "Erreur inconnue" })
    };
  }
};
