const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { panier } = JSON.parse(event.body);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: panier.map(item => ({
        price_data: {
          currency: item.monnaie,
          product_data: {
            name: item.nom,
          },
          unit_amount: Math.round(item.prix * 100), // prix en centimes
        },
        quantity: item.quantite || 1,
      })),
      success_url: "https://encompagniedesetoiles.fr/success",
      cancel_url: "https://encompagniedesetoiles.fr/cancel",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id }),
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};