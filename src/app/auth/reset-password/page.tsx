import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { requestPasswordResetAction, updatePasswordAction } from "@/app/auth/actions";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  error?: string;
  message?: string;
  code?: string;
  token_hash?: string;
  type?: string;
}>;

export default async function ResetPasswordPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const config = getSupabaseConfigStatus();
  const configError = config.authMessage;
  const code = typeof searchParams.code === "string" ? searchParams.code : "";
  const tokenHash = typeof searchParams.token_hash === "string" ? searchParams.token_hash : "";
  const recoveryType = typeof searchParams.type === "string" ? searchParams.type : "";
  const isRecoveryFlow = Boolean(code || (tokenHash && recoveryType === "recovery"));
  let recoveryError: string | null = null;

  if (!configError && isRecoveryFlow) {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        recoveryError = error.message;
      }
    } else if (tokenHash && recoveryType === "recovery") {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      if (error) {
        recoveryError = error.message;
      }
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdfbfd_0%,#ffffff_52%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[0.9fr_1.1fr] md:px-10 lg:px-12">
        <section className="rounded-[2rem] bg-[linear-gradient(160deg,#5B2C83_0%,#7b4b92_78%,#C9A15B_100%)] p-8 text-stone-50">
          <p className="text-sm uppercase tracking-[0.24em] text-white/70">
            {isRecoveryFlow ? "Set new password" : "Reset password"}
          </p>
          <h1 className="font-display mt-4 text-5xl leading-none">
            {isRecoveryFlow ? "Choose a new password." : "Reset your password securely."}
          </h1>
          <p className="mt-4 text-base leading-8 text-white/80">
            {isRecoveryFlow
              ? "Create a new secure password for your Iyeoba Weddings account."
              : "Enter your account email and we will send reset instructions."}
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

          {recoveryError ? (
            <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {recoveryError}
            </p>
          ) : null}

          {isRecoveryFlow && !recoveryError ? (
            <form action={updatePasswordAction} className="grid gap-5">
              <input type="hidden" name="returnTo" value="/auth/reset-password" />
              <div className="grid gap-2">
                <label htmlFor="password" className="text-sm font-medium text-[color:var(--color-ink)]">
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  className="field-input rounded-2xl"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-[color:var(--color-ink)]">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  className="field-input rounded-2xl"
                />
              </div>

              <button type="submit" className="btn-primary">
                Update password
              </button>
            </form>
          ) : (
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
          )}

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
