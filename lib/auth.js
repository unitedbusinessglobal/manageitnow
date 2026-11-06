// Auth placeholder. MVP plan: email + Google sign-in, plus mobile OTP.
// Until real auth lands, API routes read the caller from headers in DEV only.

export function currentUser(request) {
  if (process.env.APP_ENV === 'dev') {
    const userId = request.headers.get('x-dev-user-id');
    const orgId = request.headers.get('x-dev-org-id');
    const email = request.headers.get('x-dev-email');
    if (userId && orgId) return { id: userId, orgId, email };
  }
  return null; // TODO: verify session JWT
}

export function isPlatformAdmin(user) {
  if (!user?.email) return false;
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return admins.includes(user.email.toLowerCase());
}

export function unauthorized() {
  return Response.json({ error: 'unauthorized' }, { status: 401 });
}
