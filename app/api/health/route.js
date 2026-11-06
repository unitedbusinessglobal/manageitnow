export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ ok: true, service: 'manageitnow', env: process.env.APP_ENV || 'dev' });
}
