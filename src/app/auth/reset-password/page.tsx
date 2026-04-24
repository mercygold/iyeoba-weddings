import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { requestPasswordResetAction } from "@/app/auth/actions";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function ResetPasswordPage(props: {
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
            Reset password
          </p>
          <h1 className="font-display mt-4 text-5xl leading-none">
            Reset your password securely.
          </h1>
          <p className="mt-4 text-base leading-8 text-white/80">
            Enter your account email and we will send reset instructions.
          </p>
        </section>

        <section className="surface-card rounded-[2rem] p-8">
          {configError ? (
            <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {configError}
            </p>
          ) : null}

          {searchParams.message ? (
            <p className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {searchParams.message}
            </p>
          ) : null}

          {searchParams.error ? (
            <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {searchParams.error}
            </p>
          ) : null}

          <form action={requestPasswordResetAction} className="grid gap-5">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-[color:var(--color-ink)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="field-input rounded-2xl"
              />
            </div>

            <button type="submit" className="btn-primary">
              Send reset instructions
            </button>
          </form>

          <p className="mt-5 text-sm text-[color:var(--color-muted)]">
            Remembered your password?{" "}
            <Link href="/auth/sign-in" className="font-medium text-[color:var(--color-brand-primary)]">
              Back to sign in
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
