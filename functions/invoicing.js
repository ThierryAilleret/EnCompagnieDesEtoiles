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

      // 1. Récupérer les lignes réellement payées (depuis Stripe, plus besoin du "panier")
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ["data.price.product"],
      });

      // 2. Créer les lignes de facture à l'identique
      for (const li of lineItems.data) {
        await stripe.invoiceItems.create({
          customer: session.customer,
          description: li.description || li.price?.product?.name || "Article",
          unit_amount_decimal: String(li.amount_subtotal !== 0
            ? Math.round(li.amount_subtotal / (li.quantity || 1))
            : li.price?.unit_amount || 0),
          currency: li.currency,
          quantity: li.quantity || 1,
        });
      }

      // 3. Écart éventuel = frais de port (ligne "Livraison")
      const sommeLignes = lineItems.data.reduce((s, li) => s + li.amount_subtotal, 0);
      const ecart = (session.amount_total || 0) - sommeLignes;
      if (ecart > 0) {
        await stripe.invoiceItems.create({
          customer: session.customer,
          description: "Frais de livraison",
          unit_amount_decimal: String(ecart),
          currency: session.currency || "eur",
          quantity: 1,
        });
      }

      // 4. Créer la facture, la finaliser, puis la marquer payée hors bande
      //    (le paiement a déjà eu lieu via Checkout)
      const invoice = await stripe.invoices.create({
        customer: session.customer,
        auto_advance: false,   // ⚠️ pas de relance : c'est un reçu, pas une demande
      });

      await stripe.invoices.finalizeInvoice(invoice.id);
      await stripe.invoices.pay(invoice.id, { paid_out_of_band: true });

      // 5. Stocker l'URL de la facture dans les metadata du client
      await stripe.customers.update(session.customer, {
        metadata: { invoice_url: invoice.hosted_invoice_url }
      });
    }

    return { statusCode: 200 };
  } catch (err) {
    console.error("Webhook error:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
};