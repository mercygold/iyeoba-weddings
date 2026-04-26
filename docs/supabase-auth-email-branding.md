# Supabase Auth Email Branding (Iyeoba Weddings)

Supabase controls auth email branding from the dashboard, not app code.

## 1) Required redirect URLs

In Supabase Dashboard:
`Authentication -> URL Configuration -> Redirect URLs`

Add:

- `http://localhost:3000/auth/reset-password`
- `http://localhost:3001/auth/reset-password`
- `http://localhost:3002/auth/reset-password`
- `https://iyeobaweddings.com/auth/reset-password`

## 2) Email sender branding

In Supabase Dashboard:
`Authentication -> Settings -> SMTP Settings` (recommended)

Set:

- From name: `Iyeoba Weddings`
- From email: your branded sender (for example `hello@iyeobaweddings.com`)

Without custom SMTP, Supabase-managed sender branding may still look generic.

## 3) Email templates to update

In Supabase Dashboard:
`Authentication -> Email Templates`

Update:

- Confirm signup email
- Reset password email

### Suggested subjects

- Confirm signup: `Confirm your Iyeoba Weddings account`
- Reset password: `Reset your Iyeoba Weddings password`

### Suggested confirm signup copy

Title:
`Welcome to Iyeoba Weddings`

Body:
`Confirm your email to start planning your wedding or managing your vendor profile.`

CTA:
`Confirm email`

### Suggested reset password copy

Title:
`Reset your Iyeoba Weddings password`

Body:
`Click below to choose a new password for your Iyeoba Weddings account.`

CTA:
`Reset password`

## 4) App env var used by reset flow

Set in local + Vercel:

- `NEXT_PUBLIC_SITE_URL=https://iyeobaweddings.com`

The app uses this value for password reset redirect links in production.
