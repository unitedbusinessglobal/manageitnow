import { db } from '../../../../lib/db';
import { verifyWebhookSignature } from '../../../../lib/razorpay';

export const dynamic = 'force-dynamic';

const STATUS = {
  'subscription.activated': 'active',
  'subscription.charged': 'active',
  'subscription.pending': 'past_due',
  'subscription.halted': 'halted',
  'subscription.cancelled': 'cancelled',
};

// POST /api/webhooks/razorpay — keeps subscription status in sync.
// TODO: on subscription.charged, create the GST invoice (lib/gst.js) and email the PDF.
export async function POST(request) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get('x-razorpay-signature'))) {
    return Response.json({ error: 'invalid signature' }, { status: 400 });
  }
  const event = JSON.parse(raw);
  const status = STATUS[event.event];
  const subId = event?.payload?.subscription?.entity?.id;
  if (status && subId) {
    await db()`UPDATE subscriptions SET status = ${status} WHERE razorpay_subscription_id = ${subId}`;
  }
  return Response.json({ received: true });
}
