import Stripe from 'stripe';

const sha256 = (s) => crypto.createHash('sha256').update(s.toLowerCase().trim()).digest('hex');

export async function handler(event) {
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
      event_id: m.meta_event_id,            // déduplication avec le Purchase navigateur
      action_source: 'website',
      user_data: {
        em: [sha256(session.customer_details?.email ?? '')],
        fbp: m.98_cookie_meta_fbp || undefined,
        fbc: m.99_cookie_meta_fbc || undefined,
        client_user_agent: m.user_agent || undefined
      },
      custom_data: {
        value: (session.amount_total ?? 0) / 100,
        currency: (session.currency ?? 'eur').toUpperCase(),
        order_id: session.id
      }
    }]
  };

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

  return { statusCode: 200, body: JSON.stringify(res.ok ? 'sent' : await res.text()) };
}