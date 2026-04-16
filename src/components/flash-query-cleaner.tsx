"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FlashQueryCleanerProps = {
  keys?: string[];
};

export function FlashQueryCleaner({
  keys = ["message", "error"],
}: FlashQueryCleanerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const hadFlashKey = keys.some((key) => params.has(key));

    if (!hadFlashKey) {
      return;
    }

    const timer = window.setTimeout(() => {
      keys.forEach((key) => params.delete(key));
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [keys, pathname, router, searchParams]);

  return null;
}
