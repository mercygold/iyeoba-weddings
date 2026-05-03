# Iyeoba MVP Fast

## Goal
Ship the fastest credible v1 for Iyeoba Weddings as a marketplace-first product:

- Public vendor directory
- Vendor onboarding
- Couple wedding intake
- Lead capture to vendors
- Simple dashboards
- AI only for wedding blueprint

## What To Cut
Do not build these in MVP:

- Internal chat
- Payments
- Full quote negotiation
- Reviews
- Advanced analytics
- Vendor subscriptions
- Multi-provider AI
- Complex admin

## Fastest Stack
- Frontend: Next.js App Router
- UI: Tailwind CSS
- Backend + DB + Auth + Storage: Supabase
- AI: OpenAI for 1 endpoint only
- Hosting: Vercel
- File uploads: Supabase Storage
- Notifications: WhatsApp deep links + email links

## MVP Pages
- `/` landing page
- `/vendors` directory with category, culture, and location filters
- `/vendors/[id]` vendor profile
- `/auth/sign-up`
- `/auth/sign-in`
- `/setup` wedding intake flow
- `/blueprint` AI wedding plan result
- `/dashboard` couple dashboard
- `/vendor/onboarding`
- `/vendor/dashboard`
- `/admin/vendors` basic approval screen

## Core User Flows
### Couple
1. Sign up
2. Fill wedding profile
3. Generate AI blueprint
4. Browse vendors
5. Save vendors or request quote
6. Track contacted vendors

### Vendor
1. Sign up as vendor
2. Complete onboarding
3. Upload portfolio
4. Wait for approval
5. Receive lead
6. Contact couple via WhatsApp or email

## Data Model
### `profiles`
- `id`
- `role` (`couple`, `vendor`, `admin`)
- `full_name`
- `email`
- `phone`
- `created_at`

### `weddings`
- `id`
- `user_id`
- `wedding_type`
- `culture`
- `location`
- `guest_count`
- `budget_range`
- `wedding_date`
- `created_at`

### `vendors`
- `id`
- `user_id`
- `business_name`
- `category`
- `culture_specialization`
- `location`
- `instagram`
- `website`
- `whatsapp`
- `price_range`
- `availability_status`
- `next_available_month`
- `value_statement`
- `verified`
- `approved`
- `created_at`

### `vendor_portfolio`
- `id`
- `vendor_id`
- `image_url`
- `sort_order`

### `saved_vendors`
- `id`
- `user_id`
- `vendor_id`
- `created_at`

### `leads`
- `id`
- `user_id`
- `vendor_id`
- `wedding_id`
- `message`
- `status` (`new`, `contacted`, `booked`)
- `created_at`

### `blueprints`
- `id`
- `user_id`
- `wedding_id`
- `summary`
- `timeline_json`
- `checklist_json`
- `budget_notes`
- `missing_items`
- `created_at`

## API Surface
- `POST /api/weddings`
- `GET /api/vendors`
- `GET /api/vendors/:id`
- `POST /api/vendors`
- `POST /api/leads`
- `GET /api/leads/me`
- `POST /api/blueprint`
- `POST /api/saved-vendors`
- `GET /api/admin/vendors`
- `PATCH /api/admin/vendors/:id`

## Build Order
### Phase 1
- Set up Next.js + Tailwind + Supabase
- Add auth and role handling
- Create database tables
- Build landing page
- Build vendor directory and vendor profile page

### Phase 2
- Build vendor onboarding form
- Build couple wedding setup flow
- Build lead request flow

### Phase 3
- Build couple dashboard
- Build vendor dashboard
- Build admin vendor approval page

### Phase 4
- Add AI blueprint generation
- Cache blueprint result per wedding profile
- Add polish and mobile QA

## 14-Day Delivery Plan
### Days 1-2
- Project setup
- Schema
- Auth
- Seed sample vendors

### Days 3-4
- Landing page
- Vendor listing
- Vendor profile pages

### Days 5-6
- Vendor onboarding
- Portfolio upload
- Admin approval

### Days 7-8
- Couple onboarding
- Wedding setup flow
- Dashboard shell

### Days 9-10
- Lead request flow
- Saved vendors
- Vendor lead inbox

### Days 11-12
- AI blueprint
- Prompt hardening
- Response storage

### Days 13-14
- Mobile polish
- QA
- Launch content
- Analytics

## Prompt Shape For AI Blueprint
Input:
- culture
- wedding_type
- location
- guest_count
- budget_range

Output:
- short wedding summary
- planning checklist
- vendor categories needed
- rough timeline
- common missed items

Keep it structured JSON. Do not use freeform prose only.

## Success Metrics
- 200+ vendors onboarded
- 1,000+ visitors
- 50+ wedding setups completed
- 25+ lead requests sent
- vendor approval turnaround under 24 hours

## Recommendation
If speed is the priority, build this as:

1. Next.js frontend
2. Supabase backend
3. One AI endpoint only
4. Manual admin approval
5. WhatsApp/email lead routing instead of chat

That is the highest-speed path with the lowest technical risk.
