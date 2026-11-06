# ManageItNow — notes for Claude

Product: monday.com-style project, team and delivery management SaaS for Indian businesses. Our own US and Chennai teams are the first users. Sold standalone (no bundle with LeadItNow/TestItNow yet).

Spec: "ManageItNow — Product Spec" doc in claude.ai. Jira project key: MNGITNW. Repo: unitedbusinessglobal/manageitnow.

## Decisions
- Built from scratch (no open-source base).
- Payments: Razorpay (no AMC). Subscriptions via UPI AutoPay / card e-mandates.
- Pricing is never hard-coded: plans and customer-specific rates live in the DB and are edited in the admin console; every change goes to `rate_change_audit`.
- A plan rate change applies to new subscriptions and renewals, not mid-cycle. A customer rate stays until an admin changes it or `valid_until` passes.
- Multilingual from day one: all UI strings in `messages/<locale>.json`; English ships first, Hindi and Tamil next.

## Conventions
- Plain JavaScript (JSX), Next.js App Router, server-only code in `lib/`.
- Money in integer paise. Every tenant query filters by `org_id`.
- API routes are `export const dynamic = 'force-dynamic'` and return `Response.json`.
- AI drafts; a human approves anything sent to a client. Respect `organizations.ai_enabled`.
- WhatsApp only for opted-in users, approved templates only.
- Run `npm test` and `npm run build` before pushing.
