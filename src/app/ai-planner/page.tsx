import { MainNav } from "@/components/main-nav";
import { AiPlannerChat, type AiPlannerInitialState } from "@/components/ai-planner-chat";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiPlannerPage() {
  const profile = await getCurrentProfile();
  const initialPlannerState = profile
    ? await getLatestAiPlannerState(profile.id)
    : null;

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
          isPlanner={Boolean(profile && profile.role !== "vendor")}
          initialName={profile?.full_name ?? undefined}
          initialState={initialPlannerState}
        />
      </main>
    </div>
  );
}

async function getLatestAiPlannerState(
  userId: string,
): Promise<AiPlannerInitialState | null> {
  const supabase = await createSupabaseServerClient();
  const aiPlannerChats = supabase.from("ai_planner_chats") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => {
          limit: (count: number) => {
            maybeSingle: () => Promise<{
              data: { messages: unknown; plan: unknown } | null;
              error: {
                code?: string;
                message: string;
                details?: string;
                hint?: string;
              } | null;
            }>;
          };
        };
      };
    };
  };
  const { data, error } = await aiPlannerChats
    .select("messages, plan")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Iyeoba AI planner latest state could not be loaded", {
      layer: "supabase_select",
      code: "code" in error ? error.code : undefined,
      message: error.message,
      details: "details" in error ? error.details : undefined,
      hint: "hint" in error ? error.hint : undefined,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    messages: Array.isArray(data.messages) ? data.messages : [],
    plan: isRecord(data.plan) ? data.plan : {},
    intake: isRecord(data.plan) && isRecord(data.plan.intake) ? data.plan.intake : {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
