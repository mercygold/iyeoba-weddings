import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { PasswordField } from "@/components/password-field";
import { updatePasswordAction } from "@/app/auth/actions";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

type SearchParams = Promise<{ error?: string }>;

export default async function UpdatePasswordPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const config = getSupabaseConfigStatus();
  const configError = config.authMessage;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdfbfd_0%,#ffffff_52%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[0.9fr_1.1fr] md:px-10 lg:px-12">
        <section className="rounded-[2rem] bg-[linear-gradient(160deg,#5B2C83_0%,#7b4b92_78%,#C9A15B_100%)] p-8 text-stone-50">
          <p className="text-sm uppercase tracking-[0.24em] text-white/70">
            Update password
          </p>
          <h1 className="font-display mt-4 text-5xl leading-none">
            Choose a new password.
          </h1>
          <p className="mt-4 text-base leading-8 text-white/80">
            Set a new secure password to continue using your account.
          </p>
        </section>

        <section className="surface-card rounded-[2rem] p-8">
          {configError ? (
            <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {configError}
            </p>
          ) : null}

          {searchParams.error ? (
            <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {searchParams.error}
            </p>
          ) : null}

          <form action={updatePasswordAction} className="grid gap-5">
            <input type="hidden" name="returnTo" value="/auth/update-password" />
            <PasswordField
              id="password"
              name="password"
              label="New password"
              autoComplete="new-password"
              confirmFieldName="confirmPassword"
              showSuggestion
            />

            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm new password"
              autoComplete="new-password"
              helpText=""
            />

            <button type="submit" className="btn-primary">
              Update password
            </button>
          </form>

          <p className="mt-5 text-sm text-[color:var(--color-muted)]">
            Need to start over?{" "}
            <Link href="/auth/reset-password" className="font-medium text-[color:var(--color-brand-primary)]">
              Request another reset email
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
