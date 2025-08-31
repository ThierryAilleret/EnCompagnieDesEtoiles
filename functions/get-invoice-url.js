const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { sessionId } = JSON.parse(event.body);
    if (!sessionId) throw new Error("Session ID manquant");

    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session.customer) throw new Error("Client Stripe introuvable");

    // Récupérer les factures liées au client
    const invoices = await stripe.invoices.list({
      customer: session.customer,
      limit: 1
    });

    const invoice = invoices.data[0];
    if (!invoice || !invoice.hosted_invoice_url) throw new Error("Facture introuvable");

    return {
      statusCode: 200,
      body: JSON.stringify({ invoiceUrl: invoice.hosted_invoice_url })
    };
  } catch (err) {
    console.error("Erreur get-invoice-url :", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
