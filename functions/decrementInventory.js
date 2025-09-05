const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Méthode non autorisée'
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: 'Corps de requête invalide'
    };
  }

  const sessionId = body.sessionId;
  if (!sessionId) {
    return {
      statusCode: 400,
      body: 'sessionId manquant'
    };
  }

  try {
    // Récupère la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product']
    });

    const lineItems = session.line_items.data;

    for (const item of lineItems) {
      const product = item.price.product;
      const productId = product.id;
      const currentInventory = parseInt(product.metadata.inventory || '0', 10);

      if (currentInventory > 0) {
        const newInventory = currentInventory - item.quantity;

        // Met à jour la métadonnée "inventory"
        await stripe.products.update(productId, {
          metadata: {
            inventory: newInventory.toString()
          }
        });

        console.log(`Stock mis à jour pour ${product.name} : ${newInventory}`);
      } else {
        console.warn(`Stock déjà épuisé pour ${product.name}`);
      }
    }

    return {
      statusCode: 200,
      body: 'Stock décrémenté avec succès'
    };
  } catch (error) {
    console.error('Erreur Stripe :', error.message);
    return {
      statusCode: 500,
      body: 'Erreur lors de la mise à jour du stock'
    };
  }
};
