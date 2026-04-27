import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { SignUpCountryPhoneFields } from "@/components/sign-up-country-phone-fields";
import { signUpAction } from "@/app/auth/actions";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

type SearchParams = Promise<{
  role?: string;
  error?: string;
  next?: string;
  source?: string;
}>;

export default async function SignUpPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const defaultRole = searchParams.role === "vendor" ? "vendor" : "planner";
  const config = getSupabaseConfigStatus();
  const configError = config.authMessage;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdfbfd_0%,#ffffff_52%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:px-10 lg:px-12">
        <section className="surface-soft rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
            Create account
          </p>
          <h1 className="font-display mt-4 text-3xl leading-none text-[color:var(--color-ink)] sm:text-4xl md:text-5xl">
            Join as a planner or a vendor.
          </h1>
          <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
            Planner accounts access a private workspace for My Weddings, saved
            vendors, and inquiries. Vendor accounts access private business
            tools and vendor management areas.
          </p>
        </section>

        <section className="surface-card rounded-[2rem] p-6 sm:p-8">
          {configError ? (
            <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {configError}
            </p>
          ) : null}
          <form action={signUpAction} className="grid gap-5">
            <input type="hidden" name="next" value={searchParams.next ?? ""} />
            <input type="hidden" name="source" value={searchParams.source ?? ""} />
            <div className="grid gap-2">
              <label
                htmlFor="fullName"
                className="text-sm font-medium text-[color:var(--color-ink)]"
              >
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                required
                className="field-input rounded-2xl"
              />
            </div>

            <SignUpCountryPhoneFields />

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
                minLength={8}
                className="field-input rounded-2xl"
              />
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-[color:var(--color-ink)]"
              >
                Confirm password
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

            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium text-[color:var(--color-ink)]">
                I am joining as
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="surface-card rounded-[1.5rem] p-4">
                  <input
                    type="radio"
                    name="role"
                    value="planner"
                    defaultChecked={defaultRole === "planner"}
                  />
                  <span className="ml-3 font-medium text-[color:var(--color-ink)]">Planner</span>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                    Start the Planner, get wedding clarity, save vendors, and
                    send inquiries.
                  </p>
                </label>
                <label className="surface-card rounded-[1.5rem] p-4">
                  <input
                    type="radio"
                    name="role"
                    value="vendor"
                    defaultChecked={defaultRole === "vendor"}
                  />
                  <span className="ml-3 font-medium text-[color:var(--color-ink)]">Vendor</span>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                    Set up a profile, submit portfolio assets, and receive leads.
                  </p>
                </label>
              </div>
            </fieldset>

            {searchParams.error ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {searchParams.error}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn-primary w-full sm:w-auto"
            >
              Create account
            </button>
          </form>

          <p className="mt-5 text-sm text-[color:var(--color-muted)]">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="font-medium text-[color:var(--color-brand-primary)]">
              Sign in
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
