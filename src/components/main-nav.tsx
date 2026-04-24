import Link from "next/link";

import { getCurrentProfile } from "@/lib/auth";
import { IyeobaLogo } from "@/components/logo";

export async function MainNav() {
  const profile = await getCurrentProfile();
  const isVendor = profile?.role === "vendor";
  const isPlanner = profile?.role === "planner" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";

  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(91,44,131,0.1)] bg-white/98 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-6 py-[0.2rem] md:px-10 lg:px-12 lg:py-[0.35rem]">
        <Link
          href="/"
          aria-label="Iyeoba home"
          className="inline-flex items-center rounded-[0.8rem] bg-white px-1.5 py-0 leading-none"
        >
          <IyeobaLogo priority className="gap-0" />
        </Link>

        <nav className="flex items-center gap-2 text-[0.95rem] font-medium leading-none text-[color:var(--color-muted)] md:gap-5">
          <Link
            href="/"
            className="hidden rounded-full px-2.5 py-[0.42rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268] md:inline"
          >
            Home
          </Link>
          <Link
            href="/vendors"
            className="rounded-full px-2.5 py-[0.42rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268]"
          >
            Find Vendors
          </Link>
          <Link
            href="/#categories"
            className="hidden rounded-full px-2.5 py-[0.42rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268] md:inline"
          >
            Categories
          </Link>
          <Link
            href="/auth/sign-up?role=vendor"
            className="hidden rounded-full px-2.5 py-[0.42rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268] md:inline"
          >
            For Vendors
          </Link>
          {isPlanner ? (
            <Link
              href="/planner/dashboard"
              className="rounded-full border border-[#5B2C83] bg-[#5B2C83] px-4 py-[0.42rem] text-sm font-semibold leading-none text-[#FFFFFF] transition-all duration-200 ease-in-out hover:bg-white hover:text-[#5B2C83] hover:shadow-[0_10px_22px_-14px_rgba(91,44,131,0.52)]"
            >
              Planner
            </Link>
          ) : null}
          {isVendor ? (
            <Link
              href="/vendor/dashboard"
              className="rounded-full border border-[#5B2C83] bg-[#5B2C83] px-4 py-[0.42rem] text-sm font-semibold leading-none text-[#FFFFFF] transition-all duration-200 ease-in-out hover:bg-white hover:text-[#5B2C83] hover:shadow-[0_10px_22px_-14px_rgba(91,44,131,0.52)]"
            >
              Vendor Dashboard
            </Link>
          ) : null}
          {isAdmin ? (
            <Link
              href="/admin/vendors"
              className="rounded-full border border-[#5B2C83] bg-[#5B2C83] px-4 py-[0.42rem] text-sm font-semibold leading-none text-[#FFFFFF] transition-all duration-200 ease-in-out hover:bg-white hover:text-[#5B2C83] hover:shadow-[0_10px_22px_-14px_rgba(91,44,131,0.52)]"
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
