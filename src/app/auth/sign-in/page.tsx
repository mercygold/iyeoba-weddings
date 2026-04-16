import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { signInAction } from "@/app/auth/actions";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function SignInPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const config = getSupabaseConfigStatus();
  const configError = config.authMessage;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdfbfd_0%,#ffffff_52%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[0.9fr_1.1fr] md:px-10 lg:px-12">
        <section className="rounded-[2rem] bg-[linear-gradient(160deg,#6A3E7C_0%,#8d5d9f_78%,#C9A15B_100%)] p-8 text-stone-50">
          <p className="text-sm uppercase tracking-[0.24em] text-white/70">
            Sign in
          </p>
          <h1 className="font-display mt-4 text-5xl leading-none">
            Return to your Planner or vendor workspace.
          </h1>
          <p className="mt-4 text-base leading-8 text-white/80">
            Planner accounts return to the Planner Dashboard. Vendor accounts
            return to vendor-only dashboard tools and lead management areas.
          </p>
        </section>

        <section className="surface-card rounded-[2rem] p-8">
          {configError ? (
            <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {configError}
            </p>
          ) : null}
          <form action={signInAction} className="grid gap-5">
            <input type="hidden" name="next" value={searchParams.next ?? ""} />
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

            <div className="grid gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-[color:var(--color-ink)]"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="field-input rounded-2xl"
              />
            </div>

            {searchParams.error ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {searchParams.error}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn-primary"
            >
              Sign in
            </button>
          </form>

          <p className="mt-5 text-sm text-[color:var(--color-muted)]">
            Need an account?{" "}
            <Link href="/auth/sign-up" className="font-medium text-[color:var(--color-brand-primary)]">
              Create one here
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
