import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { getCurrentProfile } from "@/lib/auth";
import { IyeobaLogo } from "@/components/logo";

export async function MainNav() {
  const profile = await getCurrentProfile();
  const isVendor = profile?.role === "vendor";
  const isAdmin = profile?.role === "admin";
  const dashboardHref = isAdmin
    ? "/admin/vendors"
    : isVendor
      ? "/vendor/dashboard"
      : "/planner/dashboard";

  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(91,44,131,0.1)] bg-white/98 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-[0.14rem] md:px-8 lg:px-10 lg:py-[0.24rem]">
        <Link
          href="/"
          aria-label="Iyeoba home"
          className="inline-flex items-center whitespace-nowrap rounded-[0.8rem] bg-white px-1 py-0 leading-none"
        >
          <IyeobaLogo priority className="gap-0" />
        </Link>

        <nav className="flex flex-nowrap items-center gap-1.5 text-[0.95rem] font-medium leading-none text-[color:var(--color-muted)] md:gap-2.5 lg:gap-3.5">
          <Link
            href="/"
            className="hidden whitespace-nowrap rounded-full px-2 py-[0.38rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268] lg:inline"
          >
            Home
          </Link>
          <Link
            href="/vendors"
            className="whitespace-nowrap rounded-full px-2 py-[0.38rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268]"
          >
            Find Vendors
          </Link>
          <Link
            href="/#categories"
            className="hidden whitespace-nowrap rounded-full px-2 py-[0.38rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268] lg:inline"
          >
            Categories
          </Link>
          <Link
            href="/auth/sign-up?role=vendor"
            className="hidden whitespace-nowrap rounded-full px-2 py-[0.38rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268] lg:inline"
          >
            For Vendors
          </Link>
          {profile ? (
            <Link
              href={dashboardHref}
              className="whitespace-nowrap rounded-full border border-[#5B2C83] bg-[#5B2C83] px-3 py-[0.38rem] text-sm font-semibold leading-none !text-[#FFFFFF] transition-all duration-200 ease-in-out hover:bg-white hover:!text-[#5B2C83] hover:shadow-[0_10px_22px_-14px_rgba(91,44,131,0.52)]"
            >
              Dashboard
            </Link>
          ) : null}
          {!profile ? (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/sign-up?role=planner"
                className="hidden whitespace-nowrap rounded-full border border-[rgba(91,44,131,0.18)] px-2.5 py-[0.38rem] text-xs font-semibold uppercase tracking-[0.07em] text-[#5B2C83] transition-all duration-200 ease-in-out hover:border-[rgba(91,44,131,0.34)] hover:bg-[rgba(91,44,131,0.06)] md:inline-flex"
              >
                Create Planner Account
              </Link>
              <Link href="/auth/sign-in" className="btn-secondary whitespace-nowrap px-3 py-[0.38rem] text-sm leading-none">
                Sign in
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-full border border-[#5B2C83] bg-white px-3 py-[0.38rem] text-sm font-semibold leading-none text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[#5B2C83] hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
