const Stripe = require("stripe");
const crypto = require("crypto");

const sha256 = (s) =>
  crypto
    .createHash("sha256")
    .update(s.toLowerCase().trim())
    .digest("hex");

exports.handler = async (event) => {
  let stripeEvent;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    stripeEvent = stripe.webhooks.constructEvent(
      event.body, event.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_CHECKOUT_SESSION_COMPLETED_SECRET);
  } catch (err) {
    return { statusCode: 400, body: `Webhook invalid: ${err.message}` };
  }

  if (stripeEvent.type !== 'checkout.session.completed')
    return { statusCode: 200, body: 'ignored' };

  const session = stripeEvent.data.object;
  const m = session.metadata ?? {};	

  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: {
        em: [sha256(m["03_email"])] || undefined,
				fbp: m["98_cookie_meta_fbp"] || undefined,
				fbc: m["99_cookie_meta_fbc"] || undefined
      },
      custom_data: {
        value: (session.amount_total ?? 0) / 100,
        currency: (session.currency ?? 'eur').toUpperCase(),
        order_id: session.id
      }
    }]
  };

	console.log(
		"Session Stripe",
		JSON.stringify(session, null, 2)
	);
	console.log(
		"PAYLOAD AVANT ENVOI",
		JSON.stringify(payload, null, 2)
	);

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

  //return { statusCode: 200, body: JSON.stringify(res.ok ? 'sent' : await res.text()) };

	const responseText = await res.text();

	console.log("META STATUS =", res.status);
	console.log("META RESPONSE =", responseText);
	console.log("META PAYLOAD =", JSON.stringify(payload));

	return {
		statusCode: 200,
		body: JSON.stringify({
			status: res.status,
			response: responseText
		})
	};

}