# ManageItNow

AI-first project, team and delivery management for Indian businesses — and for our own US and Chennai teams first.

- **Work boards:** projects, items, subtasks, custom fields; board, table, list, calendar and timeline views
- **Delivery command center:** live tests (TestItNow), builds and deploys (GitHub, Vercel: DEV → QA → UAT → PROD), and sales pipeline (LeadItNow)
- **AI:** async stand-ups, weekly status reports, risk flags — in the reader's language
- **India-ready:** INR pricing, GST invoices, Razorpay subscriptions (UPI AutoPay), WhatsApp alerts
- **Configurable pricing:** plan rates and customer-specific rates are edited in the admin console, with an audit trail

## Stack

Next.js (React) · Node.js serverless on Vercel · Neon PostgreSQL · Claude API · Razorpay · WhatsApp Cloud API

## Getting started

```bash
npm install
cp .env.example .env.local      # fill in DATABASE_URL and the keys you have
npm run db:schema               # creates tables and seeds default plans
npm run dev                     # http://localhost:3000
npm test
```

## Project layout

| Path | What it holds |
| --- | --- |
| `app/` | Pages (landing, `/app` command center, `/admin/pricing`) and API routes under `app/api/` |
| `lib/pricing.js` | Plan vs customer-specific price resolution |
| `lib/gst.js` | CGST/SGST vs IGST split, GSTIN checks, invoice numbering |
| `lib/razorpay.js` | Razorpay plans, subscriptions, webhook signature check |
| `lib/whatsapp.js` | WhatsApp template messages |
| `lib/ai.js` | Stand-up summaries, weekly reports, rule-based risk flags |
| `lib/connectors.js` | Maps GitHub and TestItNow webhooks to delivery events |
| `lib/i18n.js`, `messages/` | UI strings per language (English now; Hindi and Tamil next) |
| `db/schema.sql`, `db/seed.sql` | Multi-tenant schema and default plans |

## Environments

DEV → QA → UAT → PROD, one Vercel project per environment, matching the pipeline used across our products.

## Status

Scaffold. Auth is a DEV-only header stub (`lib/auth.js`); real sign-in (email, Google, mobile OTP) is the first MVP story.
