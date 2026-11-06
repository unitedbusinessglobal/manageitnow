import crypto from 'node:crypto';
import { db } from '../../../../lib/db';
import { normalizeDeliveryEvent } from '../../../../lib/connectors';

export const dynamic = 'force-dynamic';

const SECRETS = {
  github: () => process.env.GITHUB_WEBHOOK_SECRET,
  testitnow: () => process.env.TESTITNOW_WEBHOOK_SECRET,
};

function verify(provider, raw, request) {
  const secret = SECRETS[provider]?.();
  if (!secret) return false;
  const header = provider === 'github'
    ? (request.headers.get('x-hub-signature-256') || '').replace(/^sha256=/, '')
    : request.headers.get('x-signature') || '';
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return header.length === expected.length && crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

// POST /api/webhooks/delivery?provider=github|testitnow&integrationId=…
// Every source lands in delivery_events through the same connector contract.
export async function POST(request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');
  const integrationId = url.searchParams.get('integrationId');
  const raw = await request.text();
  if (!verify(provider, raw, request)) return Response.json({ error: 'invalid signature' }, { status: 400 });

  const sql = db();
  const [integration] = await sql`SELECT * FROM integrations WHERE id = ${integrationId} AND provider = ${provider} AND enabled`;
  if (!integration) return Response.json({ error: 'unknown integration' }, { status: 404 });

  const evt = normalizeDeliveryEvent(provider, request.headers, JSON.parse(raw));
  if (!evt) return Response.json({ ignored: true });

  await sql`
    INSERT INTO delivery_events (org_id, project_id, provider, kind, environment, status, summary, data)
    VALUES (${integration.org_id}, ${integration.project_id}, ${provider}, ${evt.kind}, ${evt.environment ?? null},
            ${evt.status ?? null}, ${evt.summary ?? null}, ${JSON.stringify(evt.data ?? {})}::jsonb)`;
  return Response.json({ stored: true });
}
