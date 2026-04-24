import { MainNav } from "@/components/main-nav";
import { PreferencesPanel } from "@/components/preferences-panel";

export default function PreferencesPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAF9F7_0%,#ffffff_42%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto max-w-4xl px-6 py-10 md:px-10 lg:py-14">
        <section className="surface-card rounded-[2rem] p-7 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
            Manage Preferences
          </p>
          <h1 className="font-display mt-3 text-4xl text-[color:var(--color-ink)] md:text-5xl">
            Cookie and Analytics Preferences
          </h1>
          <p className="mt-5 text-sm leading-7 text-[color:var(--color-muted)]">
            Choose how analytics and optional tracking preferences are handled in
            your browser for Iyeoba Weddings. This is an MVP preference center
            and may expand as additional analytics tools are introduced.
          </p>
        </section>

        <PreferencesPanel />
      </main>
    </div>
  );
}
