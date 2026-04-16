"use client";

import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { trackClientEvent } from "@/lib/analytics-client";

type TrackedLinkProps = LinkProps &
  Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  children: ReactNode;
  className?: string;
  eventName: string;
  source?: string;
  vendorSlug?: string;
  role?: string;
  payload?: Record<string, unknown>;
};

export function TrackedLink({
  children,
  className,
  eventName,
  source,
  vendorSlug,
  role,
  payload,
  href,
  ...props
}: TrackedLinkProps) {
  const path = typeof href === "string" ? href : href.pathname?.toString() ?? "";

  return (
    <Link
      href={href}
      {...props}
      className={className}
      onClick={() =>
        trackClientEvent({
          eventName,
          source,
          vendorSlug,
          role,
          path,
          payload,
        })
      }
    >
      {children}
    </Link>
  );
}
