-- Default plans from the product spec. Admins change these in the admin console.
INSERT INTO plans (code, name, pricing_model, price_paise, billing_cycle, max_users, max_projects, features) VALUES
  ('free',       'Free',       'per_user', 0,       'monthly', 5,    3,    '{"boards": true}'),
  ('team',       'Team',       'per_user', 24900,   'annual',  NULL, NULL, '{"boards": true, "chat": true, "docs": true, "automations": true, "whatsapp": true, "ai_standups": true}'),
  ('business',   'Business',   'per_user', 44900,   'annual',  NULL, NULL, '{"boards": true, "chat": true, "docs": true, "automations": true, "whatsapp": true, "ai_standups": true, "command_center": true, "ai_reports": true, "risk_flags": true, "portfolio": true, "guests": true}'),
  ('team_pack',  'Team Pack',  'flat',     499900,  'monthly', 25,   NULL, '{"boards": true, "chat": true, "docs": true, "automations": true, "whatsapp": true, "ai_standups": true}'),
  ('enterprise', 'Enterprise', 'custom',   0,       'annual',  NULL, NULL, '{"sso": true, "audit_logs": true, "data_residency": true, "sla": true}')
ON CONFLICT (code) DO NOTHING;
