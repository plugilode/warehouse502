/*
# Create leads table for contact form inquiries

1. New Tables
- `leads`
  - `id` (uuid, primary key)
  - `name` (text, not null) — contact's full name
  - `company` (text) — optional company name
  - `email` (text, not null) — contact email
  - `phone` (text) — optional phone number
  - `service` (text) — which service they're interested in
  - `message` (text, not null) — the inquiry body
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `leads`.
- Grant INSERT to `anon, authenticated` so the public contact form (no sign-in) can submit leads.
- Grant SELECT/UPDATE/DELETE to `authenticated` so a signed-in operator can view and manage leads later.
- INSERT policy is open to anon (any site visitor can submit a lead); all other verbs are authenticated-only.
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text,
  service text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON leads TO authenticated;

DROP POLICY IF EXISTS "anon_insert_leads" ON leads;
CREATE POLICY "anon_insert_leads" ON leads FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_leads" ON leads;
CREATE POLICY "auth_select_leads" ON leads FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_leads" ON leads;
CREATE POLICY "auth_update_leads" ON leads FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_leads" ON leads;
CREATE POLICY "auth_delete_leads" ON leads FOR DELETE
TO authenticated USING (true);
