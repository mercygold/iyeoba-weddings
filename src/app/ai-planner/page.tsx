import { MainNav } from "@/components/main-nav";
import { AiPlannerChat } from "@/components/ai-planner-chat";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiPlannerPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAF9F7_0%,#ffffff_42%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto max-w-6xl px-6 py-10 md:px-10 lg:py-14">
        <section className="surface-card rounded-[2rem] p-7 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
            Iyeoba AI Planner
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl text-[color:var(--color-ink)] md:text-5xl">
                Plan your Nigerian wedding with guided next steps.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)] md:text-base">
                Share the wedding type, location, guest count, budget, date, and cultural details. Iyeoba AI will help shape a checklist, timeline, budget view, and vendor plan for traditional, court, civil, white, and diaspora celebrations.
              </p>
            </div>
            <div className="surface-soft rounded-[1.5rem] p-5 text-sm leading-7 text-[color:var(--color-muted)]">
              Iyeoba AI provides planning guidance. Traditions, pricing, and vendor availability may vary. Please confirm details with families and vendors.
            </div>
          </div>
        </section>

        <AiPlannerChat
          isAuthenticated={Boolean(profile)}
          initialName={profile?.full_name ?? undefined}
        />
      </main>
    </div>
  );
}
