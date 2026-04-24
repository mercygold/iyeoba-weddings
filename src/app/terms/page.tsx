import { MainNav } from "@/components/main-nav";

export const metadata = {
  title: "Terms of Use | Iyeoba Weddings",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAF9F7_0%,#ffffff_42%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto max-w-4xl px-6 py-10 md:px-10 lg:py-14">
        <section className="surface-card rounded-[2rem] p-7 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
            Terms of Use
          </p>
          <h1 className="font-display mt-3 text-4xl text-[color:var(--color-ink)] md:text-5xl">
            Terms for Using Iyeoba Weddings
          </h1>
          <p className="mt-3 text-sm text-[color:var(--color-muted)]">
            Last updated: April 2026
          </p>
          <p className="mt-6 text-base leading-8 text-[color:var(--color-muted)]">
            Iyeoba Weddings is operated by Jormp LLC. By using the platform,
            you agree to these Terms of Use.
          </p>
        </section>

        <div className="mt-6 grid gap-5">
          <TermsSection
            title="Acceptance of Terms"
            body="By accessing or using Iyeoba Weddings, you agree to follow these terms and applicable laws."
          />
          <TermsSection
            title="Platform Purpose"
            body="Iyeoba Weddings connects planners and vendors for Nigerian wedding discovery, communication, and planning support."
          />
          <TermsSection
            title="User Accounts"
            body="You are responsible for account security and for information provided in your profile."
          />
          <TermsSection
            title="Vendor Listings and Verification"
            body="Vendor listings may include verification processes. Vendors are responsible for accurate and lawful business information."
          />
          <TermsSection
            title="Planner and Vendor Communication"
            body="The platform provides communication features to support planner/vendor engagement. Users must communicate lawfully and respectfully."
          />
          <TermsSection
            title="Payments and Fees"
            body="Payments, subscription fees, or promotional pricing may be introduced in the future."
          />
          <TermsSection
            title="No Guarantee of Vendor Performance"
            body="Iyeoba Weddings does not guarantee vendor quality, availability, delivery outcomes, or event results."
          />
          <TermsSection
            title="No Contract Agency"
            body="Jormp LLC is not a party to contracts between planners and vendors and is not responsible for obligations under those contracts."
          />
          <TermsSection
            title="User Conduct"
            body="Users must not misuse the platform, post unlawful content, infringe rights, or interfere with platform operations."
          />
          <TermsSection
            title="Intellectual Property"
            body="All platform branding, design, and software are owned by Jormp LLC or licensed to it."
          />
          <TermsSection
            title="Content License"
            body="By uploading content (including vendor/profile content), you grant Iyeoba Weddings a non-exclusive license to host, display, and process content for service operation."
          />
          <TermsSection
            title="Disclaimers and Limitation of Liability"
            body="Services are provided as available. To the extent permitted by law, Jormp LLC disclaims implied warranties and limits liability for indirect, incidental, or consequential damages."
          />
          <TermsSection
            title="Termination"
            body="We may suspend or terminate access for violations of these terms or for platform protection."
          />
          <TermsSection
            title="Changes to Terms"
            body="We may update these terms from time to time. Continued use after updates means you accept revised terms."
          />
          <TermsSection
            title="Governing Law and Contact"
            body="These Terms are governed by the laws of California, United States, because Iyeoba Weddings is operated by Jormp LLC. Additional country-specific terms may apply where required by law. Contact: hello@iyeobaweddings.com."
          />
        </div>
      </main>
    </div>
  );
}

function TermsSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[1.4rem] border border-[rgba(91,44,131,0.09)] bg-white/90 p-6">
      <h2 className="text-xl font-semibold text-[color:var(--color-brand-primary)]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">{body}</p>
    </section>
  );
}
