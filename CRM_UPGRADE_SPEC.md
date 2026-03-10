# Sales Funnel → CRM Upgrade Spec

## Context
The Sales Funnel page at `/sales-funnel` currently has a read-only detail panel. Joe needs a real CRM to track engagements with monument companies.

## Current State
- **Page:** `app/sales-funnel/page.tsx` → `components/sales-funnel/SalesFunnelClient.tsx` (548 lines)
- **API:** `app/api/sales-funnel/route.ts` (GET only, 119 lines)
- **Partner update API:** `app/api/partners/[id]/route.ts` (already exists, PATCH for pipeline_status and is_tracked)
- **DB:** Supabase table `crm_partners` with columns: id, name, address, city, state, zip, territory, website, phone, email, pipeline_status, lead_source, total_medallions_ordered, mrr, last_contact_at, next_action, next_action_due, next_action_assignee, health_score, notes, created_at, updated_at, partner_type, is_tracked, latitude, longitude, delivery_radius_miles
- **Supabase URL:** https://lgvvylbohcboyzahhono.supabase.co
- **Supabase service key:** Available via process.env.SUPABASE_SERVICE_ROLE_KEY (already configured)
- **Auth:** Basic auth middleware already handles auth for all API routes

## What to Build

### 1. New Supabase Table: `crm_activities`
Create via Supabase REST API (POST to /rest/v1/rpc or direct SQL).

```sql
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES crm_partners(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'demo', 'note', 'follow_up', 'order', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  contact_name TEXT,
  outcome TEXT,
  created_by TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_activities_partner ON crm_activities(partner_id);
CREATE INDEX idx_crm_activities_created ON crm_activities(created_at DESC);
```

### 2. New Supabase Table: `crm_contacts`
```sql
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES crm_partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_contacts_partner ON crm_contacts(partner_id);
```

### 3. API Endpoints

#### `app/api/partners/[id]/route.ts` — Upgrade PATCH
- Make ALL fields on crm_partners editable (name, phone, email, website, city, state, zip, territory, notes, next_action, next_action_due, next_action_assignee, pipeline_status, is_tracked)
- On any update, set `updated_at = now()`
- When updating `pipeline_status`, auto-log an activity "Stage changed to X"
- When updating `next_action`, auto-log an activity "Next action set: X"

#### `app/api/partners/[id]/activities/route.ts` — NEW
- **GET:** Fetch all activities for a partner, ordered by created_at DESC, limit 50
- **POST:** Create a new activity. Body: { activity_type, title, description?, contact_name?, outcome? }
  - After creating activity, update `crm_partners.last_contact_at = NOW()` (except for type 'note')

#### `app/api/partners/[id]/contacts/route.ts` — NEW
- **GET:** Fetch all contacts for a partner
- **POST:** Create a new contact. Body: { name, role?, phone?, email?, is_primary?, notes? }
- **PATCH:** Update a contact (include contact id in body)
- **DELETE:** Delete a contact (include contact id in body or query param)

### 4. UI Upgrade — DetailPanel

Transform the read-only detail panel into a full CRM view with these sections:

#### A. Editable Company Info
- Click any field (phone, email, website, city/state, territory) to edit inline
- Save button per section or auto-save on blur
- Add email field (currently missing from UI but exists in DB)

#### B. Activity Timeline (NEW — most important feature)
- Chronological list of all touches/engagements
- Each activity shows: icon (by type), title, description, contact name, date, outcome
- "Log Activity" button opens a form with:
  - Type dropdown (📞 Call, 📧 Email, 🤝 Meeting, 🎯 Demo, 📝 Note, 📋 Follow-up, 📦 Order)
  - Title (required)
  - Description (optional, textarea)
  - Contact name (optional, with autocomplete from crm_contacts)
  - Outcome (optional)
- Activity icons/colors by type

#### C. Contact Management (NEW)
- List of contacts at the company (name, role, phone, email)
- Add/edit/delete contacts
- Mark one as primary
- Quick-dial and quick-email links

#### D. Quick Actions Bar (NEW)
- "Log Call" — one-click opens activity form pre-filled with type=call
- "Send Email" — opens mailto: link with company email, logs email activity
- "Schedule Follow-up" — sets next_action + next_action_due, logs activity
- "Add Note" — quick note input that logs as activity

#### E. Next Action Section (upgraded)
- Editable next action text
- Editable due date (date picker)
- Assignee dropdown (Joe, Blake, Clara)
- Visual urgency indicator (overdue = red, due today = yellow, future = green)

### 5. Style Requirements
- Match existing dark theme (bg-[#0f0f0f], border-[#2a2a2a], text-white, accent #10b981)
- Smooth transitions and hover states
- Mobile-friendly (panel should work on mobile too)
- Use lucide-react icons (already installed)

### 6. Deployment
- Git branch: staging
- After building, commit with message: "feat: CRM upgrade — activity tracking, contacts, editable company info"
- Deploy: `vercel --prod --yes --token=vcp_0XVkxAaK4Lh4Z3Dz4l1pKJTYN9Vm5psPc1f5weVEyZdZzWLArB4Wotvb`

## Supabase Access (for creating tables)
Use the Supabase Management API or SQL endpoint:
```
URL: https://lgvvylbohcboyzahhono.supabase.co
Service Key: (available as SUPABASE_SERVICE_ROLE_KEY env var)
```

To run SQL, POST to `/rest/v1/rpc` won't work for DDL. Instead, just create the tables by making the API endpoints handle "table doesn't exist" gracefully, OR use the Supabase SQL editor. For this build, create a migration script at `scripts/crm-migration.sql` that I can run manually.

## Important Notes
- Do NOT break existing functionality (stage moves, tracking, filters, search)
- The existing `handleMovePartner` and `handleTrackPartner` functions must keep working
- Keep the kanban board view as-is, only upgrade the detail panel
- All API calls must use the existing auth pattern (sbHeaders with service role key)
