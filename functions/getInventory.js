const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  const params = event.queryStringParameters;
  const productId = params.product;
  const priceId = params.price; // ← nouveau paramètre optionnel

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

    // 💰 Prix : récupéré depuis Stripe si un priceId est fourni
    let prix = null;
    let monnaie = null;
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      prix = price.unit_amount;      // en centimes (4000 = 40,00 €)
      monnaie = price.currency;      // "eur"
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        inventory: parseInt(inventory, 10),
        prix: prix,
        monnaie: monnaie
      })
    };
  } catch (error) {
    console.error('Erreur Stripe :', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur lors de la récupération du stock.' })
    };
  }
};