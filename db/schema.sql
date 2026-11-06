-- ManageItNow database schema (PostgreSQL / Neon)
-- Multi-tenant: every tenant-owned row carries org_id.
-- Money is stored as integer paise (1 INR = 100 paise).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================== Tenancy and people =====================

CREATE TABLE IF NOT EXISTS organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  gstin         text,                       -- customer GSTIN (optional for B2C)
  state_code    char(2),                    -- GST state code, e.g. '33' Tamil Nadu
  billing_email text,
  default_locale text NOT NULL DEFAULT 'en',
  timezone      text NOT NULL DEFAULT 'Asia/Kolkata',
  work_week     smallint NOT NULL DEFAULT 5 CHECK (work_week IN (5, 6)),
  ai_enabled    boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE,
  phone         text UNIQUE,                -- E.164, used for OTP sign-in and WhatsApp
  name          text NOT NULL,
  locale        text NOT NULL DEFAULT 'en',
  timezone      text NOT NULL DEFAULT 'Asia/Kolkata',
  work_start    time NOT NULL DEFAULT '09:30',
  work_end      time NOT NULL DEFAULT '18:30',
  whatsapp_opt_in boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS memberships (
  org_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role     text NOT NULL CHECK (role IN ('owner','admin','manager','member','guest')),
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== Work management =====================

CREATE TABLE IF NOT EXISTS projects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  health       text NOT NULL DEFAULT 'on_track' CHECK (health IN ('on_track','at_risk','off_track')),
  start_date   date,
  due_date     date,
  owner_id     uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_org_idx ON projects(org_id);

-- Custom field definitions per project (status, dropdowns, numbers, dates…)
CREATE TABLE IF NOT EXISTS field_definitions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('text','number','date','dropdown','person','checkbox')),
  options    jsonb NOT NULL DEFAULT '[]',
  position   int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES items(id) ON DELETE CASCADE,   -- subtasks
  title       text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'todo',
  priority    text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assignee_id uuid REFERENCES users(id),
  start_date  date,
  due_date    date,
  fields      jsonb NOT NULL DEFAULT '{}',                    -- custom field values keyed by field id
  position    double precision NOT NULL DEFAULT 0,
  source      text,                                           -- 'native' | 'testitnow' | 'github' | 'jira' …
  external_id text,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS items_project_idx ON items(project_id);
CREATE INDEX IF NOT EXISTS items_assignee_idx ON items(assignee_id);

CREATE TABLE IF NOT EXISTS item_dependencies (
  item_id       uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  depends_on_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, depends_on_id)
);

-- ===================== Collaboration =====================

CREATE TABLE IF NOT EXISTS comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id    uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES users(id),
  body       text NOT NULL,
  mentions   uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,   -- null = org-wide or DM
  name       text,
  is_direct  boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES users(id),
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS docs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL,                 -- assigned | mentioned | due_soon | standup | digest …
  payload    jsonb NOT NULL DEFAULT '{}',
  channels   text[] NOT NULL DEFAULT '{in_app}',  -- in_app | email | whatsapp
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== AI =====================

CREATE TABLE IF NOT EXISTS standups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id),
  for_date    date NOT NULL,
  yesterday   text,
  today       text,
  blockers    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id, for_date)
);

CREATE TABLE IF NOT EXISTS ai_outputs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  kind        text NOT NULL,                -- standup_summary | weekly_report | risk_flags
  locale      text NOT NULL DEFAULT 'en',
  content     text NOT NULL,
  source_item_ids uuid[] NOT NULL DEFAULT '{}',
  approved_by uuid REFERENCES users(id),    -- human approval before anything goes to a client
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ===================== Integrations (delivery command center) =====================

CREATE TABLE IF NOT EXISTS integrations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  provider   text NOT NULL CHECK (provider IN ('testitnow','github','vercel','leaditnow','jira')),
  config     jsonb NOT NULL DEFAULT '{}',   -- repo name, project key, mappings (no secrets)
  enabled    boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Normalised events from every source; the command center reads only this table.
CREATE TABLE IF NOT EXISTS delivery_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  provider    text NOT NULL,
  kind        text NOT NULL,                -- test_run | deploy | pull_request | deal_stage …
  environment text,                         -- dev | qa | uat | prod (deploys)
  status      text,                         -- passed | failed | success | error | won …
  summary     text,
  data        jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS delivery_events_project_idx ON delivery_events(project_id, occurred_at DESC);

-- ===================== Pricing and billing =====================

-- Plans are edited in the admin console; nothing is hard-coded.
CREATE TABLE IF NOT EXISTS plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,     -- free | team | business | team_pack | enterprise
  name            text NOT NULL,
  pricing_model   text NOT NULL CHECK (pricing_model IN ('per_user','flat','custom')),
  price_paise     bigint NOT NULL DEFAULT 0,  -- per user per month, or flat per month
  billing_cycle   text NOT NULL DEFAULT 'annual' CHECK (billing_cycle IN ('monthly','annual')),
  max_users       int,
  max_projects    int,
  features        jsonb NOT NULL DEFAULT '{}',
  is_public       boolean NOT NULL DEFAULT true,
  razorpay_plan_id text,
  active          boolean NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Customer-specific rates: override price, discount or features for one org.
CREATE TABLE IF NOT EXISTS customer_pricing (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id          uuid NOT NULL REFERENCES plans(id),
  price_paise      bigint,                  -- fixed override; null = use plan price
  discount_percent numeric(5,2) CHECK (discount_percent BETWEEN 0 AND 100),
  features         jsonb,                   -- feature overrides merged over plan features
  notes            text,
  valid_from       date NOT NULL DEFAULT current_date,
  valid_until      date,
  UNIQUE (org_id, plan_id, valid_from)
);

CREATE TABLE IF NOT EXISTS rate_change_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by  uuid REFERENCES users(id),
  target      text NOT NULL CHECK (target IN ('plan','customer_pricing')),
  target_id   uuid NOT NULL,
  old_value   jsonb,
  new_value   jsonb NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                uuid NOT NULL REFERENCES plans(id),
  seats                  int NOT NULL DEFAULT 1,
  status                 text NOT NULL DEFAULT 'trialing'
                         CHECK (status IN ('trialing','active','past_due','cancelled','halted')),
  current_period_end     date,
  razorpay_subscription_id text UNIQUE,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id),
  invoice_number  text UNIQUE NOT NULL,     -- sequential per financial year, e.g. MIN/2026-27/000123
  invoice_date    date NOT NULL DEFAULT current_date,
  customer_gstin  text,
  place_of_supply char(2),
  sac_code        text NOT NULL,
  taxable_paise   bigint NOT NULL,
  cgst_paise      bigint NOT NULL DEFAULT 0,
  sgst_paise      bigint NOT NULL DEFAULT 0,
  igst_paise      bigint NOT NULL DEFAULT 0,
  total_paise     bigint NOT NULL,
  razorpay_payment_id text,
  pdf_url         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_counters (
  financial_year text PRIMARY KEY,          -- e.g. '2026-27'
  last_number    int NOT NULL DEFAULT 0
);
