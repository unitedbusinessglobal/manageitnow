import { describe, it, expect } from 'vitest';
import { resolvePrice, isOverrideActive, formatINR } from '../lib/pricing.js';

const team = { code: 'team', pricing_model: 'per_user', price_paise: 24900, billing_cycle: 'annual', features: { chat: true } };
const pack = { code: 'team_pack', pricing_model: 'flat', price_paise: 499900, billing_cycle: 'monthly', max_users: 25, features: {} };
const on = new Date('2026-11-05T00:00:00Z');

describe('resolvePrice', () => {
  it('uses the plan price with no override', () => {
    const r = resolvePrice(team, null, 10, on);
    expect(r).toMatchObject({ unitPaise: 24900, monthlyPaise: 249000, periodPaise: 2988000, months: 12, source: 'plan' });
  });

  it('applies a customer fixed price', () => {
    const r = resolvePrice(team, { price_paise: 19900, valid_from: '2026-01-01' }, 10, on);
    expect(r.unitPaise).toBe(19900);
    expect(r.source).toBe('customer_price');
  });

  it('applies a customer discount', () => {
    const r = resolvePrice(team, { discount_percent: 20, valid_from: '2026-01-01' }, 1, on);
    expect(r.unitPaise).toBe(19920);
    expect(r.source).toBe('customer_discount');
  });

  it('ignores an expired override', () => {
    const r = resolvePrice(team, { price_paise: 100, valid_from: '2025-01-01', valid_until: '2025-12-31' }, 1, on);
    expect(r.source).toBe('plan');
  });

  it('bills flat plans once regardless of seats', () => {
    const r = resolvePrice(pack, null, 20, on);
    expect(r.monthlyPaise).toBe(499900);
    expect(r.seats).toBe(1);
  });

  it('merges customer feature overrides', () => {
    const r = resolvePrice(team, { features: { command_center: true }, valid_from: '2026-01-01' }, 1, on);
    expect(r.features).toEqual({ chat: true, command_center: true });
  });

  it('rejects bad seat counts', () => {
    expect(() => resolvePrice(team, null, 0, on)).toThrow();
  });
});

describe('isOverrideActive', () => {
  it('is false before valid_from', () => {
    expect(isOverrideActive({ valid_from: '2027-01-01' }, on)).toBe(false);
  });
});

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(1234567800)).toBe('₹1,23,45,678');
  });
});
