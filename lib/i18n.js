// Minimal i18n: every UI string lives in messages/<locale>.json.
// English ships first; Hindi and Tamil are wave 2 (see spec).
import en from '../messages/en.json';

export const SUPPORTED_LOCALES = ['en'];
export const PLANNED_LOCALES = ['hi', 'ta', 'te', 'kn', 'mr', 'bn', 'gu', 'ml'];

const dictionaries = { en };

/** Look up a dotted key, e.g. t('en', 'nav.projects'); falls back to English, then the key. */
export function t(locale, key, vars = {}) {
  const pick = (dict) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
  let text = pick(dictionaries[locale] || {}) ?? pick(en) ?? key;
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
