const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      Buffer.from(event.body, "utf8"), sig, endpointSecret
    );

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      // 📄 La facture est créée automatiquement par invoice_creation
      //    (déjà payée, liée au paiement, avec ses metadata)
      const sessionId = session.invoice
        ? null
        : session.id;
      const s = session.invoice
        ? session
        : await stripe.checkout.sessions.retrieve(session.id, { expand: ["invoice"] });

      if (s.invoice) {
        await stripe.customers.update(session.customer, {
          metadata: { invoice_url: s.invoice.hosted_invoice_url || s.invoice.id }
        });
      }
    }

    return { statusCode: 200 };
  } catch (err) {
    console.error("Webhook error:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
};