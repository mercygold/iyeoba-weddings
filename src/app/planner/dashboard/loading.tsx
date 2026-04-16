import { MainNav } from "@/components/main-nav";

export default function PlannerDashboardLoading() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6effa_0%,#fcf8ff_18%,#ffffff_48%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 md:px-10 lg:px-12 lg:py-12">
        <section className="surface-card rounded-[2rem] p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
            Planner Dashboard
          </p>
          <h1 className="font-display mt-4 text-4xl text-[color:var(--color-ink)]">
            Loading your planner data
          </h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
            Fetching your latest inquiries, replies, and saved vendors.
          </p>
          <div className="mt-6 grid gap-3">
            <div className="h-16 animate-pulse rounded-[1rem] bg-[rgba(106,62,124,0.08)]" />
            <div className="h-16 animate-pulse rounded-[1rem] bg-[rgba(106,62,124,0.08)]" />
            <div className="h-16 animate-pulse rounded-[1rem] bg-[rgba(106,62,124,0.08)]" />
          </div>
        </section>
      </main>
    </div>
  );
}
