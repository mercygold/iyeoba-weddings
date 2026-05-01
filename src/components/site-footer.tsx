import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative mt-14 overflow-hidden border-t border-[rgba(201,161,91,0.24)] bg-[color:var(--color-brand-primary)] text-white">
      <div className="relative mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1.35fr_1fr_1fr_1fr_1fr] md:px-10 lg:px-12">
        <div className="space-y-3">
          <p className="font-display text-2xl leading-none">Iyeoba Weddings</p>
          <p className="max-w-sm text-sm leading-7 text-white/80">
            Plan your Nigerian wedding anywhere in the world.
          </p>
        </div>

        <FooterColumn
          title="Explore"
          links={[
            { href: "/", label: "Home" },
            { href: "/vendors", label: "Find Vendors" },
            { href: "/ai-planner", label: "AI Planner" },
            { href: "/#categories", label: "Categories" },
          ]}
        />
        <FooterColumn
          title="Vendors"
          links={[
            { href: "/auth/sign-up?role=vendor", label: "List your business" },
            { href: "/vendor/dashboard", label: "Vendor dashboard" },
          ]}
        />
        <FooterColumn
          title="Planning"
          links={[
            { href: "/auth/sign-up?role=planner", label: "Create planner account" },
            { href: "/planner/dashboard", label: "Planner dashboard" },
          ]}
        />
        <FooterColumn
          title="Contact"
          links={[{ href: "mailto:hello@iyeobaweddings.com", label: "hello@iyeobaweddings.com" }]}
        />
      </div>
      <div className="mx-auto max-w-6xl border-t border-white/15 px-6 pb-7 pt-4 text-xs text-white/78 md:px-10 lg:px-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/privacy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms of Use
            </Link>
            <Link href="/preferences" className="hover:text-white">
              Manage Preferences
            </Link>
          </div>
          <p>© 2026 Jormp LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-gold)]">
        {title}
      </p>
      <div className="flex flex-col gap-2 text-sm">
        {links.map((link) => (
          <Link
            key={`${title}-${link.href}-${link.label}`}
            href={link.href}
            className="text-white/82 transition-colors duration-200 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
