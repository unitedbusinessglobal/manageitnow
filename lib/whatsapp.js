// WhatsApp notifications via Meta's WhatsApp Cloud API.
// Only send to users who opted in, and only with approved message templates.

/**
 * Send an approved template message.
 * @param {string} toE164   recipient phone, e.g. "+919876543210"
 * @param {string} template approved template name, e.g. "task_assigned"
 * @param {string} locale   template language code, e.g. "en", "hi", "ta"
 * @param {string[]} params body placeholders in order
 */
export async function sendTemplate(toE164, template, locale = 'en', params = []) {
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) throw new Error('WhatsApp is not configured');

  const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toE164.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: template,
        language: { code: locale },
        components: params.length
          ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: String(text) })) }]
          : [],
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`WhatsApp send failed: ${json?.error?.message || res.status}`);
  return json;
}
