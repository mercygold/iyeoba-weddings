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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 px-4 py-1 sm:gap-3 sm:px-5 sm:py-[0.14rem] md:px-8 lg:px-10 lg:py-[0.24rem]">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/"
            aria-label="Iyeoba home"
            className="inline-flex items-center whitespace-nowrap rounded-[0.8rem] bg-white px-0.5 py-0 leading-none sm:px-1"
          >
            <IyeobaLogo priority className="gap-0" />
          </Link>
          <span
            title="Iyeoba Weddings is currently in beta. Features and vendor profiles are being improved as we onboard users."
            className="inline-flex shrink-0 items-center rounded-full border border-[#C9A15B] bg-[rgba(201,161,91,0.08)] px-1.5 py-0.5 text-[0.55rem] font-bold uppercase leading-none tracking-[0.14em] text-[#5B2C83] sm:px-2 sm:text-[0.62rem]"
          >
            BETA
          </span>
        </div>

        <nav className="flex flex-nowrap items-center gap-1 text-[0.78rem] font-medium leading-none text-[color:var(--color-muted)] sm:gap-1.5 sm:text-[0.95rem] md:gap-2.5 lg:gap-3.5">
          <Link
            href="/"
            className="hidden whitespace-nowrap rounded-full px-2 py-[0.38rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268] lg:inline"
          >
            Home
          </Link>
          <Link
            href="/vendors"
            className="hidden whitespace-nowrap rounded-full px-2 py-[0.38rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268] sm:inline"
          >
            Find Vendors
          </Link>
          <Link
            href="/ai-planner"
            className="group relative inline-flex whitespace-nowrap rounded-full px-2 py-[0.38rem] font-bold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[rgba(91,44,131,0.08)] hover:text-[#4A2268] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A15B]"
          >
            <span className="relative">AI Planner</span>
            <span
              aria-hidden="true"
              className="ai-planner-sparkle ai-planner-sparkle-main pointer-events-none absolute -right-1.5 -top-2 h-[1.25rem] w-[1.25rem] text-[#E4C27A] motion-safe:will-change-transform"
            >
              <svg viewBox="0 0 20 20" className="h-full w-full">
                <path
                  fill="currentColor"
                  d="M10 1.8l1.7 5.4L17.1 9l-5.4 1.8L10 16.2l-1.7-5.4L2.9 9l5.4-1.8L10 1.8z"
                />
              </svg>
            </span>
            <span
              aria-hidden="true"
              className="ai-planner-sparkle ai-planner-sparkle-small-one pointer-events-none absolute right-3 -top-2.5 h-3 w-3 text-[#D4AF6A] motion-safe:will-change-transform"
            >
              <svg viewBox="0 0 20 20" className="h-full w-full">
                <path
                  fill="currentColor"
                  d="M10 2.8l1.2 4 4 1.2-4 1.2-1.2 4-1.2-4-4-1.2 4-1.2 1.2-4z"
                />
              </svg>
            </span>
            <span
              aria-hidden="true"
              className="ai-planner-sparkle ai-planner-sparkle-small-two pointer-events-none absolute -right-3 top-0.5 h-3.5 w-3.5 text-[#C9A15B] motion-safe:will-change-transform"
            >
              <svg viewBox="0 0 20 20" className="h-full w-full">
                <path
                  fill="currentColor"
                  d="M10 3.2l1.1 3.7 3.7 1.1-3.7 1.1-1.1 3.7-1.1-3.7-3.7-1.1 3.7-1.1 1.1-3.7z"
                />
              </svg>
            </span>
            <span
              aria-hidden="true"
              className="ai-planner-sparkle ai-planner-sparkle-small-three pointer-events-none absolute right-0 -top-3 h-2.5 w-2.5 text-[#F0D48B] motion-safe:will-change-transform"
            >
              <svg viewBox="0 0 20 20" className="h-full w-full">
                <path
                  fill="currentColor"
                  d="M10 4.1l.9 3 3 .9-3 .9-.9 3-.9-3-3-.9 3-.9.9-3z"
                />
              </svg>
            </span>
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
              className="whitespace-nowrap rounded-full border border-[#5B2C83] bg-[#5B2C83] px-2.5 py-[0.36rem] text-[0.78rem] font-semibold leading-none !text-[#FFFFFF] transition-all duration-200 ease-in-out hover:bg-white hover:!text-[#5B2C83] hover:shadow-[0_10px_22px_-14px_rgba(91,44,131,0.52)] sm:px-3 sm:text-sm"
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
                  className="whitespace-nowrap rounded-full border border-[#5B2C83] bg-white px-2.5 py-[0.36rem] text-[0.78rem] font-semibold leading-none text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[#5B2C83] hover:text-white sm:px-3 sm:text-sm"
                >
                  Sign out
                </button>
              </form>
              <span className="hidden whitespace-nowrap text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[color:var(--color-muted)]/78 md:inline">
                {isVendor ? "Vendor account" : "Planner account"}
              </span>
            </div>
          )}
        </nav>
      </div>
      <style>
        {`
          .ai-planner-sparkle {
            opacity: 0.98;
            filter:
              drop-shadow(0 0 2px rgba(255, 246, 207, 0.95))
              drop-shadow(0 0 9px rgba(201, 161, 91, 0.7))
              drop-shadow(0 0 14px rgba(228, 194, 122, 0.32));
            transform-origin: center;
          }

          @media (prefers-reduced-motion: no-preference) {
            .ai-planner-sparkle {
              will-change: transform, opacity, filter;
            }

            .ai-planner-sparkle-main {
              animation: iyeobaAiPlannerTwinkleMain 2.7s ease-in-out infinite;
            }

            .ai-planner-sparkle-small-one {
              animation: iyeobaAiPlannerTwinkleDriftOne 3.4s ease-in-out 0.35s infinite;
            }

            .ai-planner-sparkle-small-two {
              animation: iyeobaAiPlannerTwinkleDriftTwo 3.9s ease-in-out 0.78s infinite;
            }

            .ai-planner-sparkle-small-three {
              animation: iyeobaAiPlannerTwinkleDriftThree 3.15s ease-in-out 1.12s infinite;
            }
          }

          @keyframes iyeobaAiPlannerTwinkleMain {
            0%, 100% {
              opacity: 0.82;
              transform: translate3d(0, 0, 0) scale(0.92) rotate(0deg);
              filter:
                drop-shadow(0 0 2px rgba(255, 246, 207, 0.95))
                drop-shadow(0 0 8px rgba(201, 161, 91, 0.62));
            }
            50% {
              opacity: 1;
              transform: translate3d(0.7px, -1.3px, 0) scale(1.18) rotate(4deg);
              filter:
                drop-shadow(0 0 3px rgba(255, 247, 210, 1))
                drop-shadow(0 0 14px rgba(228, 194, 122, 0.9))
                drop-shadow(0 0 20px rgba(212, 175, 106, 0.42));
            }
          }

          @keyframes iyeobaAiPlannerTwinkleDriftOne {
            0%, 100% {
              opacity: 0.76;
              transform: translate3d(0, 0, 0) scale(0.86);
            }
            48% {
              opacity: 1;
              transform: translate3d(0.8px, -1px, 0) scale(1.2);
            }
          }

          @keyframes iyeobaAiPlannerTwinkleDriftTwo {
            0%, 100% {
              opacity: 0.74;
              transform: translate3d(0, 0, 0) scale(0.88) rotate(0deg);
            }
            52% {
              opacity: 1;
              transform: translate3d(-0.9px, -0.8px, 0) scale(1.17) rotate(-5deg);
            }
          }

          @keyframes iyeobaAiPlannerTwinkleDriftThree {
            0%, 100% {
              opacity: 0.72;
              transform: translate3d(0, 0, 0) scale(0.84);
            }
            45% {
              opacity: 1;
              transform: translate3d(0.6px, -1px, 0) scale(1.16);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .ai-planner-sparkle {
              animation: none;
              opacity: 0.96;
              transform: none;
            }
          }
        `}
      </style>
    </header>
  );
}
