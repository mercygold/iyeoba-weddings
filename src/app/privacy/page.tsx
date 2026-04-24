import { MainNav } from "@/components/main-nav";

export const metadata = {
  title: "Privacy Policy | Iyeoba Weddings",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAF9F7_0%,#ffffff_42%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto max-w-4xl px-6 py-10 md:px-10 lg:py-14">
        <section className="surface-card rounded-[2rem] p-7 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
            Privacy Policy
          </p>
          <h1 className="font-display mt-3 text-4xl text-[color:var(--color-ink)] md:text-5xl">
            Privacy at Iyeoba Weddings
          </h1>
          <p className="mt-3 text-sm text-[color:var(--color-muted)]">
            Last updated: April 2026
          </p>
          <p className="mt-6 text-base leading-8 text-[color:var(--color-muted)]">
            Iyeoba Weddings is operated by Jormp LLC. This Privacy Policy explains
            how we collect, use, and protect personal information when you use
            the platform.
          </p>
        </section>

        <div className="mt-6 grid gap-5">
          <PolicySection
            title="Information We Collect"
            body="We may collect name, email, account profile details, vendor business details, uploaded vendor verification materials where applicable, planner/vendor messages and inquiries, usage analytics, device/browser data, and cookies or similar technologies."
          />
          <PolicySection
            title="How We Use Information"
            body="We use information for account creation, vendor discovery, planner and vendor communication, platform security, service improvement, analytics, support, and legal compliance."
          />
          <PolicySection
            title="GDPR Legal Bases"
            body="For users in GDPR-covered regions, processing may rely on contract performance, legitimate interests, consent where required, and legal obligations."
          />
          <PolicySection
            title="California Privacy Rights"
            body="California users may have rights to know/access, delete, and correct personal information, opt out of sale/sharing where applicable, limit sensitive information where applicable, and receive non-discriminatory treatment for exercising privacy rights."
          />
          <PolicySection
            title="Sale of Personal Information"
            body="We do not sell personal information for money."
          />
          <PolicySection
            title="Analytics and Cookies"
            body="We may use analytics tools to understand usage and improve the product. Cookie and analytics preferences can be managed at /preferences."
          />
          <PolicySection
            title="Data Retention"
            body="We retain information as long as needed to provide services, comply with law, resolve disputes, and enforce agreements."
          />
          <PolicySection
            title="Your Privacy Rights"
            body="You may contact hello@iyeobaweddings.com to request access, correction, deletion, or privacy-related support."
          />
          <PolicySection
            title="Vendor Responsibility"
            body="Vendors are responsible for the accuracy of listings and business information they provide on the platform."
          />
          <PolicySection
            title="Security"
            body="We use reasonable safeguards to protect personal information, but no system is 100% secure."
          />
          <PolicySection
            title="International Users"
            body="If you use Iyeoba Weddings outside the United States, you understand your information may be processed in the United States or other countries where our service providers operate. Privacy-related matters are interpreted in line with California, United States law because Iyeoba Weddings is operated by Jormp LLC, with additional country-specific requirements applied where legally required."
          />
        </div>
      </main>
    </div>
  );
}

function PolicySection({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[1.4rem] border border-[rgba(91,44,131,0.09)] bg-white/90 p-6">
      <h2 className="text-xl font-semibold text-[color:var(--color-brand-primary)]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">{body}</p>
    </section>
  );
}
