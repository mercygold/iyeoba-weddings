"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type VendorProfileAvatarLinkProps = {
  href: string;
  businessName: string;
  imageUrl?: string | null;
  sizeClassName?: string;
};

export function VendorProfileAvatarLink({
  href,
  businessName,
  imageUrl,
  sizeClassName = "h-20 w-20",
}: VendorProfileAvatarLinkProps) {
  const initials = getInitials(businessName);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const normalizedImageUrl = imageUrl?.trim() ?? null;
  const hasImage =
    Boolean(normalizedImageUrl) && failedImageUrl !== normalizedImageUrl;

  return (
    <Link
      href={href}
      aria-label={`Open ${businessName} profile`}
      className={`group relative inline-flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-[rgba(201,161,91,0.42)] shadow-[0_12px_30px_-22px_rgba(106,62,124,0.45)] transition duration-200 hover:ring-[rgba(201,161,91,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-primary)] ${sizeClassName}`}
    >
      {hasImage ? (
        <Image
          key={normalizedImageUrl}
          src={normalizedImageUrl!}
          alt={`${businessName} profile image`}
          fill
          sizes="96px"
          onError={() => setFailedImageUrl(normalizedImageUrl)}
          className="object-cover object-center transition duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#7A4A8D_0%,#6A3E7C_62%,#5D356D_100%)] text-base font-semibold tracking-[0.03em] text-white">
          {initials}
        </span>
      )}
    </Link>
  );
}

function getInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) {
    return "IV";
  }

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}
