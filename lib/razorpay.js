// Razorpay billing (no AMC). Server-side only — never import into client components.
import crypto from 'node:crypto';

const API = 'https://api.razorpay.com/v1';

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error('Razorpay keys are not configured');
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
}

async function call(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Razorpay ${path} failed: ${json?.error?.description || res.status}`);
  return json;
}

/**
 * Create a Razorpay plan matching a ManageItNow price.
 * Called when an admin creates or changes a plan, or sets a customer-specific rate.
 */
export function createPlan({ name, amountPaise, cycle }) {
  return call('/plans', {
    period: cycle === 'annual' ? 'yearly' : 'monthly',
    interval: 1,
    item: { name, amount: amountPaise, currency: 'INR' },
  });
}

/** Start a subscription (UPI AutoPay / card e-mandate) on a Razorpay plan. */
export function createSubscription({ razorpayPlanId, totalCount = 12, quantity = 1, notes = {} }) {
  return call('/subscriptions', {
    plan_id: razorpayPlanId,
    total_count: totalCount,
    quantity,
    customer_notify: 1,
    notes,
  });
}

/**
 * Verify a webhook. Razorpay signs the raw request body with the webhook
 * secret using HMAC-SHA256 and sends it in the X-Razorpay-Signature header.
 */
export function verifyWebhookSignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
