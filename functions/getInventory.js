const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  const params = event.queryStringParameters;
  const productId = params.product;

  if (!productId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Paramètre "product" manquant.' })
    };
  }

  try {
    // Récupère le produit Stripe par son ID
    const product = await stripe.products.retrieve(productId);

    // Lit la métadonnée "inventory"
    const inventory = product.metadata.inventory || '0';

    return {
      statusCode: 200,
      body: JSON.stringify({ inventory: parseInt(inventory, 10) })
    };
  } catch (error) {
    console.error('Erreur Stripe :', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur lors de la récupération du stock.' })
    };
  }
};
