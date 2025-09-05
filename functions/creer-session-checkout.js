const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { panier, client } = JSON.parse(event.body);
    // console.log("Panier reçu:", panier);
    // console.log("Création session Stripe...");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
			customer_creation: "always",
			customer_email: client.email,

      line_items: panier.map(item => ({
        // price_data: {
          // currency: item.monnaie,
          // product_data: {
            // name: item.nom,
						// description: item.description,
          // },
          // unit_amount: Math.round(item.prix * 100),
        // },
				price: item.priceIdStripe,
        quantity: item.quantite || 1,
      })),
      success_url: "https://encompagniedesetoiles.fr/success",
      cancel_url: "https://encompagniedesetoiles.fr/cancel",
			
	     // ✅ Ajout du panier dans metadata pour le webhook
			metadata: {
				panier: JSON.stringify(panier),
				nomClient: client.nom,
				prenomClient: client.prenom,
				emailClient: client.email,
				adresseClient: client.adresse,
				complement: client.complement,
				pointRelais: client.pointRelais
			}
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sessionId: session.id }),
    };
  } catch (err) {
    console.error("Stripe error:", err);
    console.error("Stack:", err.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: err.message || "Erreur inconnue" })
    };
  }
};
