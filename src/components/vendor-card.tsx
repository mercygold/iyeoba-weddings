import Image from "next/image";
import Link from "next/link";

import { VendorProfileAvatarLink } from "@/components/vendor-profile-avatar-link";
import type { VendorDirectoryItem } from "@/lib/vendors";

export function VendorCard({
  vendor,
  mode = "default",
}: {
  vendor: VendorDirectoryItem;
  mode?: "default" | "homepage";
}) {
  const isHomepage = mode === "homepage";

  const hero = (
    <div
      className={`relative overflow-hidden bg-[color:var(--color-brand-soft)] ${
        isHomepage ? "aspect-[16/9]" : "aspect-[16/10]"
      }`}
    >
      <Image
        src={vendor.imageUrl}
        alt={`${vendor.businessName} placeholder cover`}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        className="object-cover object-center transition duration-500"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,18,39,0.02)_0%,rgba(33,18,39,0.68)_100%)]" />
      <div
        className={`absolute inset-x-0 bottom-0 flex items-end justify-between text-white ${
          isHomepage ? "gap-2.5 p-3" : "gap-3 p-3.5"
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-[0.2em] text-white/78">
            {vendor.category}
          </p>
          <h2
            className={`font-display line-clamp-2 break-words leading-none ${
              isHomepage ? "mt-0.5 text-[1.4rem]" : "mt-1 text-[1.5rem]"
            }`}
          >
            {vendor.businessName}
          </h2>
          <p className={`truncate text-sm text-white/82 ${isHomepage ? "mt-1" : "mt-1.5"}`}>
            {vendor.location}
          </p>
        </div>
        {vendor.verified ? (
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            Verified
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <article className="overflow-hidden rounded-[1.85rem] border border-[rgba(106,62,124,0.09)] bg-white shadow-[0_24px_56px_-42px_rgba(106,62,124,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-38px_rgba(106,62,124,0.24)]">
      {isHomepage ? (
        <Link
          href={`/vendors/${vendor.slug}`}
          aria-label={`Open ${vendor.businessName} profile`}
          className="block"
        >
          {hero}
        </Link>
      ) : (
        hero
      )}

      <div className={isHomepage ? "space-y-3 p-3" : "space-y-3.5 p-3.5"}>
        <div className="grid gap-2.5 text-sm text-[color:var(--color-muted)] sm:grid-cols-2">
          <Detail label="Culture" value={vendor.cultureSpecialization} />
          <Detail label="Starting price" value={vendor.priceRange} />
          <Detail
            label="Booking status"
            value={getPublicBookingStatus(vendor.availabilityStatus)}
          />
          <Detail label="Services" value={vendor.servicesOffered[0] ?? "Wedding service"} />
        </div>

        <p
          className={`break-words text-sm text-[color:var(--color-muted)] ${
            isHomepage ? "line-clamp-2 leading-5" : "line-clamp-2 leading-6"
          }`}
        >
          {vendor.description}
        </p>

        <div className={isHomepage ? "flex flex-nowrap gap-2 overflow-x-auto pb-1" : "flex flex-wrap gap-2.5"}>
          {!isHomepage ? (
            <VendorProfileAvatarLink
              href={`/vendors/${vendor.slug}`}
              businessName={vendor.businessName}
              imageUrl={vendor.imageUrl}
              sizeClassName="h-[72px] w-[72px]"
            />
          ) : null}
          <Link
            href={`/planner/dashboard?saved=${vendor.slug}`}
            className={isHomepage ? "btn-secondary px-3 py-1.5 text-sm leading-none" : "btn-secondary"}
          >
            Save Vendor
          </Link>
          <Link
            href={`/vendors/${vendor.slug}`}
            className={isHomepage ? "btn-secondary px-3 py-1.5 text-sm leading-none" : "btn-secondary"}
          >
            Start Inquiry
          </Link>
          {vendor.whatsapp ? (
            <a
              href={`https://wa.me/${vendor.whatsapp.replace(/[^\d+]/g, "").replace(/^\+/, "")}`}
              target="_blank"
              rel="noreferrer"
              className={isHomepage ? "btn-secondary px-3 py-1.5 text-sm leading-none" : "btn-secondary"}
            >
              Contact on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate font-medium text-[color:var(--color-ink)]">{value}</p>
    </div>
  );
}

function getPublicBookingStatus(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "Accepting bookings";
  }

  const internalWorkflowTerms = [
    "submitted for review",
    "pending_review",
    "pending review",
    "needs_changes",
    "needs changes",
    "draft",
    "archived",
    "suspended",
    "under review",
  ];

  if (internalWorkflowTerms.some((term) => normalized.includes(term))) {
    return "Accepting bookings";
  }

  if (normalized.includes("limited")) {
    return "Limited availability";
  }

  if (normalized.includes("2 month") || normalized.includes("two month")) {
    return "Booking 2 months ahead";
  }

  return value ?? "Accepting bookings";
}
