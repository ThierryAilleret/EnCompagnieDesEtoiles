const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    console.log("Clé Stripe:", process.env.STRIPE_SECRET_KEY);

    const { panier } = JSON.parse(event.body);
    console.log("Panier reçu:", panier);
    console.log("Création session Stripe...");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: panier.map(item => ({
        price_data: {
          currency: item.monnaie,
          product_data: {
            name: item.nom,
						description: "Description du produit",
          },
          unit_amount: Math.round(item.prix * 100),
        },
        quantity: item.quantite || 1,
      })),
      success_url: "https://encompagniedesetoiles.fr/success",
      cancel_url: "https://encompagniedesetoiles.fr/cancel",
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
