const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_DECREMENT_INVENTORY_SECRET;

  let stripeEvent;

  try {
    // 🔐 Vérifie la signature du webhook
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      // 🔍 Récupère les produits achetés via les line_items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ["data.price.product"]
      });

      for (const item of lineItems.data) {
        const product = item.price.product;
        const productId = product.id;
        const currentInventory = parseInt(product.metadata.inventory || "0", 10);
        const quantity = item.quantity || 1;

        if (currentInventory >= quantity) {
          const newInventory = currentInventory - quantity;

          // 🛠️ Met à jour la métadonnée "inventory" dans Stripe
          await stripe.products.update(productId, {
            metadata: {
              inventory: newInventory.toString()
            }
          });

          console.log(`✅ Stock mis à jour pour ${product.name} : ${newInventory}`);
        } else {
          console.warn(`⚠️ Stock insuffisant pour ${product.name} (stock actuel : ${currentInventory})`);
        }
      }
    }

    return { statusCode: 200 };
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
};
