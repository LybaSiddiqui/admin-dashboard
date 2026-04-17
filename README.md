# Admin Dashboard — Setup Guide

## What you get
A live admin dashboard with login, showing:
- Overview KPIs (revenue, customers, churn count)
- Product performance (top sellers + underperformers)
- Customer statistics (segment breakdown with charts)
- Churn risk table (customers inactive 180+ days)

---

## Step 1 — Create your free Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click "New project" — give it a name and set a database password
3. Wait ~2 minutes for it to spin up

---

## Step 2 — Run the migration

1. In your Supabase dashboard, click **SQL Editor** → **New query**
2. Paste the entire contents of `migration.sql` and click **Run**
3. You should see "Success" — this creates your tables and dashboard functions

---

## Step 3 — Import your data

For each table, export from MySQL Workbench as CSV, then import into Supabase:

1. In MySQL Workbench: right-click a table → **Table Data Export Wizard** → CSV
2. In Supabase: open **Table Editor** → click the table → **Import data from CSV**

Import in this order to avoid foreign key errors:
  customers → products → transactions → behavioral_metrics → customer_segmentation

---

## Step 4 — Add an admin user

1. In Supabase: go to **Authentication** → **Users** → **Invite user**
2. Enter your email — you'll get an email with a link to set your password
3. That's your login for the dashboard

---

## Step 5 — Set up the React app

```bash
# Install dependencies
npm install

# Copy and fill in your Supabase credentials
cp .env.example .env
```

Open `.env` and paste your Supabase URL and anon key.
Find these in: Supabase dashboard → Settings → API

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
# Run locally
npm run dev
```

Open http://localhost:5173 — you should see the login screen.

---

## Step 6 — Deploy to Vercel (free hosting)

1. Push this folder to a GitHub repository
2. Go to https://vercel.com → New project → import your repo
3. In Vercel's environment variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click Deploy — your dashboard is live at a free `.vercel.app` URL

---

## Troubleshooting

**"function product_performance does not exist"**
→ Re-run the migration.sql in the Supabase SQL Editor

**Login fails with "invalid credentials"**
→ Make sure you accepted the invite email and set a password

**Charts show empty**
→ Check that your CSV import completed for all 5 tables
