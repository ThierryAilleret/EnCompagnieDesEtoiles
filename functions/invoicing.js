const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      // 1. Créer le client Stripe (si pas déjà existant)
      const customer = await stripe.customers.retrieve(session.customer);

      // 2. Créer les lignes de facture
      const panier = session.metadata ? JSON.parse(session.metadata.panier) : [];

      for (const item of panier) {
				await stripe.invoiceItems.create({
					customer: session.customer,
					description: item.nom,
					unit_amount_decimal: String(Math.round(item.prix * 100)), // ✅ prix unitaire
					currency: item.monnaie,
					quantity: item.quantite || 1,
				});
      }

      // 3. Créer et finaliser la facture
      const invoice = await stripe.invoices.create({
        customer: session.customer,
        auto_advance: true,
      });

      await stripe.invoices.finalizeInvoice(invoice.id);
			
			// 4. Stocker l'URL dans le client pour la retrouver plus tard
			await stripe.customers.update(session.customer, {
				metadata: {
					invoice_url: invoice.hosted_invoice_url
				}
			});
    }

    return { statusCode: 200 };
  } catch (err) {
    console.error("Webhook error:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
};
