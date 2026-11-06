'use client';

import { useEffect, useState } from 'react';
import { formatINR } from '../../../lib/pricing';

// Admin pricing console: edit plan rates and see customer-specific rates.
// DEV auth: set x-dev-* headers via the fields below until real sign-in lands.
export default function PricingAdmin() {
  const [dev, setDev] = useState({ userId: '', orgId: '', email: '' });
  const [plans, setPlans] = useState([]);
  const [custom, setCustom] = useState([]);
  const [error, setError] = useState('');

  const headers = () => ({
    'Content-Type': 'application/json',
    'x-dev-user-id': dev.userId,
    'x-dev-org-id': dev.orgId,
    'x-dev-email': dev.email,
  });

  async function load() {
    setError('');
    try {
      const [p, c] = await Promise.all([
        fetch('/api/admin/plans', { headers: headers() }).then((r) => r.json()),
        fetch('/api/admin/customer-pricing', { headers: headers() }).then((r) => r.json()),
      ]);
      if (p.error) throw new Error(p.error);
      setPlans(p.plans || []);
      setCustom(c.customerPricing || []);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function savePrice(plan, rupees) {
    const price_paise = Math.round(Number(rupees) * 100);
    if (!Number.isFinite(price_paise) || price_paise < 0) return setError('Enter a valid amount');
    const res = await fetch('/api/admin/plans', { method: 'PUT', headers: headers(), body: JSON.stringify({ id: plan.id, price_paise }) });
    const json = await res.json();
    if (json.error) return setError(json.error);
    setPlans((ps) => ps.map((p) => (p.id === plan.id ? json.plan : p)));
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('min-dev') || 'null');
      if (saved) setDev(saved);
    } catch {}
  }, []);

  return (
    <main>
      <h1>Plan pricing</h1>
      <p className="lead">Edit plan rates and set customer-specific prices. Every change is logged. Prices exclude 18% GST.</p>

      <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {['userId', 'orgId', 'email'].map((k) => (
          <input key={k} placeholder={`dev ${k}`} value={dev[k]}
                 onChange={(e) => setDev({ ...dev, [k]: e.target.value })} />
        ))}
        <button className="btn" onClick={() => { try { localStorage.setItem('min-dev', JSON.stringify(dev)); } catch {} load(); }}>Load</button>
      </div>
      {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}

      <h2>Plans</h2>
      <table>
        <thead><tr><th>Plan</th><th>Model</th><th>Current price</th><th>New price (₹)</th><th>Cycle</th><th>Max users</th></tr></thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.pricing_model === 'per_user' ? 'per user / month' : p.pricing_model === 'flat' ? 'flat / month' : 'custom'}</td>
              <td>{formatINR(Number(p.price_paise))}</td>
              <td>
                <form onSubmit={(e) => { e.preventDefault(); savePrice(p, new FormData(e.currentTarget).get('rupees')); }}>
                  <input name="rupees" type="number" min="0" step="1" style={{ width: 100 }} defaultValue={Number(p.price_paise) / 100} />{' '}
                  <button className="btn" type="submit">Save</button>
                </form>
              </td>
              <td>{p.billing_cycle}</td>
              <td>{p.max_users ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Customer-specific rates</h2>
      <table>
        <thead><tr><th>Customer</th><th>Plan</th><th>Rate</th><th>From</th><th>Until</th><th>Notes</th></tr></thead>
        <tbody>
          {custom.length === 0 && <tr><td colSpan={6}>No customer-specific rates yet.</td></tr>}
          {custom.map((c) => (
            <tr key={c.id}>
              <td>{c.org_name}</td>
              <td>{c.plan_code}</td>
              <td>{c.price_paise != null ? formatINR(Number(c.price_paise)) : c.discount_percent != null ? `${c.discount_percent}% off` : 'features only'}</td>
              <td>{String(c.valid_from).slice(0, 10)}</td>
              <td>{c.valid_until ? String(c.valid_until).slice(0, 10) : '—'}</td>
              <td>{c.notes ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
