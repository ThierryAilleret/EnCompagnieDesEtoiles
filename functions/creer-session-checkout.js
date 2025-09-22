const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { panier, client } = JSON.parse(event.body);

    // Détection de l'environnement Stripe
    const isLive = process.env.STRIPE_ENV === "live";

    // Création de la session de paiement
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_creation: "always",
      customer_email: client.email,

      line_items: panier.map(item => ({
        price: item.priceIdStripe,
        quantity: item.quantite || 1,
      })),

      success_url: "https://encompagniedesetoiles.fr/success",
      cancel_url: "https://encompagniedesetoiles.fr/cancel",

      metadata: {
        panier: JSON.stringify(panier),
        nomClient: client.nom,
        prenomClient: client.prenom,
        emailClient: client.email,
        adresseClient: client.adresse,
        complement: client.complement,
        pointRelais: client.pointRelais,
        environnement: isLive ? "live" : "test"
      }
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sessionId: session.id }),
    };
  } catch (err) {
    console.error("Stripe error:", err);
    console.error("Stack:", err.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: err.message || "Erreur inconnue" })
    };
  }
};
	