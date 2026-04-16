import Link from "next/link";

import { getCurrentProfile } from "@/lib/auth";
import { IyeobaLogo } from "@/components/logo";

export async function MainNav() {
  const profile = await getCurrentProfile();
  const isVendor = profile?.role === "vendor";
  const isPlanner = profile?.role === "planner" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";

  return (
    <header className="sticky top-0 z-10 border-b border-[rgba(106,62,124,0.06)] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-6 py-1 md:px-10 lg:px-12 lg:py-1.5">
        <Link href="/" aria-label="Iyeoba home" className="inline-flex items-center leading-none">
          <IyeobaLogo priority className="gap-0" />
        </Link>

        <nav className="flex items-center gap-2 text-[0.95rem] font-medium leading-none text-[color:var(--color-muted)] md:gap-5">
          <Link
            href="/"
            className="hidden rounded-full px-2.5 py-1 font-semibold text-[#5B2F70] transition-all duration-200 ease-in-out hover:bg-[rgba(106,62,124,0.08)] hover:text-[#6A3E7C] hover:shadow-[0_8px_18px_-14px_rgba(106,62,124,0.45)] md:inline"
          >
            Home
          </Link>
          <Link
            href="/vendors"
            className="rounded-full px-2.5 py-1 font-semibold text-[#5B2F70] transition-all duration-200 ease-in-out hover:bg-[rgba(106,62,124,0.08)] hover:text-[#6A3E7C] hover:shadow-[0_8px_18px_-14px_rgba(106,62,124,0.45)]"
          >
            Find Vendors
          </Link>
          <Link
            href="/#categories"
            className="hidden rounded-full px-2.5 py-1 font-semibold text-[#5B2F70] transition-all duration-200 ease-in-out hover:bg-[rgba(106,62,124,0.08)] hover:text-[#6A3E7C] hover:shadow-[0_8px_18px_-14px_rgba(106,62,124,0.45)] md:inline"
          >
            Categories
          </Link>
          <Link
            href="/auth/sign-up?role=vendor"
            className="hidden rounded-full px-2.5 py-1 font-semibold text-[#5B2F70] transition-all duration-200 ease-in-out hover:bg-[rgba(106,62,124,0.08)] hover:text-[#6A3E7C] hover:shadow-[0_8px_18px_-14px_rgba(106,62,124,0.45)] md:inline"
          >
            For Vendors
          </Link>
          {isPlanner ? (
            <Link
              href="/planner/dashboard"
              className="surface-soft rounded-full border border-[rgba(106,62,124,0.12)] px-4 py-1 text-sm font-medium leading-none text-[color:var(--color-brand-primary)] transition-all duration-200 ease-in-out hover:border-[rgba(106,62,124,0.2)] hover:bg-[rgba(106,62,124,0.1)] hover:text-[color:var(--color-brand-primary)]"
            >
              Planner
            </Link>
          ) : null}
          {isVendor ? (
            <Link
              href="/vendor/dashboard"
              className="surface-soft rounded-full border border-[rgba(106,62,124,0.12)] px-4 py-1 text-sm font-medium leading-none text-[color:var(--color-brand-primary)] transition-all duration-200 ease-in-out hover:border-[rgba(106,62,124,0.2)] hover:bg-[rgba(106,62,124,0.1)] hover:text-[color:var(--color-brand-primary)]"
            >
              Vendor Dashboard
            </Link>
          ) : null}
          {isAdmin ? (
            <Link
              href="/admin/vendors"
              className="surface-soft rounded-full border border-[rgba(106,62,124,0.12)] px-4 py-1 text-sm font-medium leading-none text-[color:var(--color-brand-primary)] transition-all duration-200 ease-in-out hover:border-[rgba(106,62,124,0.2)] hover:bg-[rgba(106,62,124,0.1)] hover:text-[color:var(--color-brand-primary)]"
            >
              Admin
            </Link>
          ) : null}
          {!profile ? (
            <Link href="/auth/sign-in" className="btn-secondary px-4 py-1 text-sm leading-none">
              Sign in
            </Link>
          ) : (
            <span className="hidden text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--color-muted)]/80 md:inline">
              {isVendor ? "Vendor account" : "Planner account"}
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
