"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { AuthSignOutForm } from "@/components/auth-sign-out-form";
import type { Profile } from "@/lib/auth";

type MobileMainNavProps = {
  profile: Profile | null;
  dashboardHref: string;
};

export function MobileMainNav({ profile, dashboardHref }: MobileMainNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="relative flex items-center gap-2 md:hidden">
      {!profile ? (
        <Link
          href="/auth/sign-in"
          onClick={closeMenu}
          className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-[rgba(201,161,91,0.55)] bg-white px-3 text-sm font-semibold leading-none text-[#A47A2F] shadow-sm"
        >
          Sign in
        </Link>
      ) : (
        <Link
          href={dashboardHref}
          onClick={closeMenu}
          className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-[#5B2C83] bg-[#5B2C83] px-3 text-sm font-semibold leading-none text-white shadow-sm"
        >
          Dashboard
        </Link>
      )}

      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-main-nav-menu"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(91,44,131,0.2)] bg-white text-[#5B2C83] shadow-sm"
      >
        {isOpen ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {isOpen ? (
        <div
          id="mobile-main-nav-menu"
          className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(19rem,calc(100vw-2rem))] rounded-[1.25rem] border border-[rgba(91,44,131,0.12)] bg-white p-3 text-sm font-semibold text-[#5B2C83] shadow-[0_24px_54px_-28px_rgba(31,31,31,0.45)]"
        >
          <div className="grid gap-1">
            <MobileNavLink href="/" onClick={closeMenu}>
              Home
            </MobileNavLink>
            <MobileNavLink href="/vendors" onClick={closeMenu}>
              Find Vendors
            </MobileNavLink>
            <MobileNavLink href="/ai-planner" onClick={closeMenu}>
              AI Planner
            </MobileNavLink>
            <MobileNavLink href="/#categories" onClick={closeMenu}>
              Categories
            </MobileNavLink>
            {!profile ? (
              <>
                <MobileNavLink href="/auth/sign-up?role=planner" onClick={closeMenu}>
                  Create Planner Account
                </MobileNavLink>
                <MobileNavLink href="/auth/sign-up?role=vendor" onClick={closeMenu}>
                  For Vendors
                </MobileNavLink>
                <MobileNavLink href="/auth/sign-in" onClick={closeMenu} highlight>
                  Sign in
                </MobileNavLink>
              </>
            ) : (
              <>
                <MobileNavLink href={dashboardHref} onClick={closeMenu} highlight>
                  Dashboard
                </MobileNavLink>
                <AuthSignOutForm
                  onBeforeSubmit={closeMenu}
                  className="mt-1 min-h-11 w-full rounded-full border border-[#5B2C83] bg-white px-3 text-sm font-semibold leading-none text-[#5B2C83] disabled:cursor-wait disabled:opacity-70"
                />
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
  highlight = false,
}: {
  href: string;
  onClick: () => void;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        highlight
          ? "flex min-h-11 items-center justify-center rounded-full bg-[#5B2C83] px-4 py-3 text-center text-white"
          : "flex min-h-11 items-center justify-center rounded-full px-4 py-3 hover:bg-[rgba(91,44,131,0.06)]"
      }
    >
      {children}
    </Link>
  );
}
