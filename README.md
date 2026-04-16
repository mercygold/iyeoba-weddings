# Iyeoba Weddings MVP

Phase 1 scaffold for a marketplace-first wedding planning product built with:

- Next.js App Router
- Tailwind CSS
- Supabase Auth + Postgres
- One OpenAI blueprint endpoint

## Phase 1 Included
- Landing page
- Auth pages with role selection for planner and vendor accounts
- Planner setup flow and Planner Dashboard
- Vendor-only dashboard route scaffold
- Vendor directory
- Vendor profile page
- Supabase schema SQL
- `.env.example`
- `/api/blueprint` OpenAI endpoint

## Project Structure
```text
src/
  app/
    api/blueprint/route.ts
    auth/
      actions.ts
      callback/route.ts
      sign-in/page.tsx
      sign-up/page.tsx
    dashboard/page.tsx
    planner/
      dashboard/page.tsx
      setup/page.tsx
    vendor/
      dashboard/page.tsx
    vendors/
      [slug]/page.tsx
      page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    logo.tsx
    main-nav.tsx
    vendor-card.tsx
  lib/
    auth.ts
    planner.ts
    sample-vendors.ts
    vendors.ts
    supabase/
      client.ts
      server.ts
supabase/
  schema.sql
```

## Environment Variables
Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Optional:

- `OPENAI_MODEL`

## Supabase Setup
1. Create a new Supabase project.
2. Open the  editor.
3. Run [supabase/schema.sql](/Users/mercygold/iyeoba-mvp/supabase/schema.sql).
4. Copy your project URL, anon key, and service-role key into `.env.local`.

## Run Instructions
Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Notes
- If Supabase env vars are missing, the app still runs with sample vendor data.
- Vendor uploads, admin review, and server-side vendor saves require `SUPABASE_SERVICE_ROLE_KEY`.
- The OpenAI endpoint is available at `POST /api/blueprint` and expects wedding context JSON.

## Example Blueprint Request
```bash
curl -X POST http://localhost:3000/api/blueprint \
  -H "Content-Type: application/json" \
  -d '{
    "culture": "Yoruba",
    "wedding_type": "Traditional and white wedding",
    "location": "Lagos",
    "guest_count": 250,
    "budget_range": "NGN 8M to NGN 15M"
  }'
```
