const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { sessionId } = JSON.parse(event.body);

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return { statusCode: 400, body: JSON.stringify({ error: "Session invalide" }) };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // On ne renvoie que le nécessaire, rien de sensible
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statut: session.payment_status,   // "paid"
        montantTotal: session.amount_total,
        email: session.customer_details?.email || session.metadata?.email,
        metadata: session.metadata
      })
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};