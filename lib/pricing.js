// Pricing rules for ManageItNow.
// All money is integer paise. Plan rates and customer overrides come from the
// database (edited in the admin console); this module only applies the rules.

/**
 * Is a customer-specific rate in force on a given date?
 * @param {{valid_from: string, valid_until?: string|null}} override
 * @param {Date} on
 */
export function isOverrideActive(override, on = new Date()) {
  if (!override) return false;
  const day = on.toISOString().slice(0, 10);
  if (override.valid_from && day < override.valid_from) return false;
  if (override.valid_until && day > override.valid_until) return false;
  return true;
}

/**
 * Work out what one org pays per billing period for a plan.
 * Precedence: customer fixed price > customer discount on plan price > plan price.
 *
 * @param {object} plan      row from `plans`
 * @param {object|null} override row from `customer_pricing` (or null)
 * @param {number} seats     users billed (ignored for flat plans)
 * @param {Date} on
 * @returns {{unitPaise:number, seats:number, monthlyPaise:number, periodPaise:number, months:number, source:string, features:object}}
 */
export function resolvePrice(plan, override, seats = 1, on = new Date()) {
  if (!plan) throw new Error('plan is required');
  if (!Number.isInteger(seats) || seats < 1) throw new Error('seats must be a positive integer');
  if (plan.max_users && plan.pricing_model === 'per_user' && seats > plan.max_users) {
    throw new Error(`plan ${plan.code} allows at most ${plan.max_users} users`);
  }

  const active = isOverrideActive(override, on) ? override : null;
  let unitPaise = Number(plan.price_paise);
  let source = 'plan';

  if (active && active.price_paise != null) {
    unitPaise = Number(active.price_paise);
    source = 'customer_price';
  } else if (active && active.discount_percent != null) {
    const pct = Number(active.discount_percent);
    unitPaise = Math.round(unitPaise * (100 - pct) / 100);
    source = 'customer_discount';
  }

  const billedSeats = plan.pricing_model === 'per_user' ? seats : 1;
  const monthlyPaise = unitPaise * billedSeats;
  const months = plan.billing_cycle === 'annual' ? 12 : 1;

  return {
    unitPaise,
    seats: billedSeats,
    monthlyPaise,
    periodPaise: monthlyPaise * months,
    months,
    source,
    features: { ...(plan.features || {}), ...((active && active.features) || {}) },
  };
}

/** Format paise as Indian rupees, e.g. 1234567 -> "₹12,345.67" (lakh grouping). */
export function formatINR(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}
