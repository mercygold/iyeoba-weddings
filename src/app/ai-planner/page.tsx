import { MainNav } from "@/components/main-nav";
import {
  AiPlannerChat,
  type AiPlannerChatHistoryItem,
  type AiPlannerInitialState,
  type AiPlannerWeddingEvent,
} from "@/components/ai-planner-chat";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AiPlannerPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const profile = await getCurrentProfile();
  const selectedWeddingId = readSingle(searchParams.weddingId);
  const selectedChatId = readSingle(searchParams.chatId);
  const plannerData = profile
    ? await getAiPlannerData(profile.id, {
        selectedWeddingId,
        selectedChatId,
      })
    : {
        weddingEvents: [],
        chatHistory: [],
        initialPlannerState: null,
        selectedWeddingId: null,
        selectedChatId: null,
      };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAF9F7_0%,#ffffff_42%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-10 lg:py-12">
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
          initialState={plannerData.initialPlannerState}
          weddingEvents={plannerData.weddingEvents}
          chatHistory={plannerData.chatHistory}
          selectedWeddingId={plannerData.selectedWeddingId}
          selectedChatId={plannerData.selectedChatId}
        />
      </main>
    </div>
  );
}

async function getAiPlannerData(
  userId: string,
  {
    selectedWeddingId,
    selectedChatId,
  }: {
    selectedWeddingId?: string | null;
    selectedChatId?: string | null;
  },
): Promise<{
  weddingEvents: AiPlannerWeddingEvent[];
  chatHistory: AiPlannerChatHistoryItem[];
  initialPlannerState: AiPlannerInitialState | null;
  selectedWeddingId: string | null;
  selectedChatId: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const [weddingEvents, chatHistory] = await Promise.all([
    getAiPlannerWeddingEvents(userId),
    getAiPlannerChatHistory(userId),
  ]);
  const normalizedSelectedWeddingId =
    selectedWeddingId && weddingEvents.some((event) => event.id === selectedWeddingId)
      ? selectedWeddingId
      : null;
  const selectedChat =
    (selectedChatId && chatHistory.find((chat) => chat.id === selectedChatId)) ||
    (normalizedSelectedWeddingId
      ? chatHistory.find((chat) => chat.weddingId === normalizedSelectedWeddingId)
      : null) ||
    chatHistory[0] ||
    null;

  return {
    weddingEvents,
    chatHistory,
    initialPlannerState: selectedChat
      ? {
          id: selectedChat.id,
          title: selectedChat.title,
          weddingId: selectedChat.weddingId,
          messages: selectedChat.messages,
          plan: selectedChat.plan,
          intake: isRecord(selectedChat.plan?.intake) ? selectedChat.plan.intake : {},
        }
      : null,
    selectedWeddingId:
      selectedChat?.weddingId ??
      normalizedSelectedWeddingId ??
      weddingEvents[0]?.id ??
      null,
    selectedChatId: selectedChat?.id ?? null,
  };
}

async function getAiPlannerWeddingEvents(userId: string): Promise<AiPlannerWeddingEvent[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("weddings")
    .select("id, event_name, wedding_type, culture, location, guest_count, budget_range, wedding_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Iyeoba AI planner wedding events could not be loaded", {
      layer: "weddings_select",
      code: error.code ?? undefined,
      message: error.message,
      details: error.details ?? undefined,
      hint: error.hint ?? undefined,
    });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: buildWeddingTitle(row),
    weddingType: stringValue(row.wedding_type),
    culture: stringValue(row.culture),
    location: stringValue(row.location),
    guestCount: row.guest_count === null ? null : Number(row.guest_count),
    budgetRange: stringValue(row.budget_range),
    weddingDate: stringValue(row.wedding_date) || null,
    createdAt: stringValue(row.created_at) || null,
  }));
}

async function getAiPlannerChatHistory(userId: string): Promise<AiPlannerChatHistoryItem[]> {
  const supabase = await createSupabaseServerClient();
  const aiPlannerChats = supabase.from("ai_planner_chats") as any;
  const selectWithWedding = "id, wedding_id, title, messages, plan, created_at, updated_at";
  let result = await aiPlannerChats
    .select(selectWithWedding)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (result.error && isMissingColumnError(result.error)) {
    result = await aiPlannerChats
      .select("id, title, messages, plan, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);
  }

  if (result.error) {
    console.warn("Iyeoba AI planner chat history could not be loaded", {
      layer: "ai_planner_chats_select",
      code: result.error.code ?? undefined,
      message: result.error.message,
      details: result.error.details ?? undefined,
      hint: result.error.hint ?? undefined,
    });
    return [];
  }

  return ((result.data ?? []) as unknown[]).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      title: stringValue(record.title) || getChatFallbackTitle(record.messages),
      weddingId: stringValue(record.wedding_id) || null,
      messages: Array.isArray(record.messages) ? record.messages : [],
      plan: isRecord(record.plan) ? record.plan : {},
      createdAt: stringValue(record.created_at) || null,
      updatedAt: stringValue(record.updated_at) || null,
    };
  });
}

function buildWeddingTitle(row: {
  event_name?: string | null;
  culture?: string | null;
  wedding_type?: string | null;
}) {
  return (
    stringValue(row.event_name) ||
    `${stringValue(row.culture)} ${stringValue(row.wedding_type)}`.trim() ||
    "Wedding event"
  );
}

function getChatFallbackTitle(messages: unknown) {
  if (!Array.isArray(messages)) {
    return "Iyeoba AI Planner chat";
  }
  const firstUserMessage = messages.find(
    (message): message is { role?: unknown; content?: unknown } =>
      isRecord(message) &&
      message.role === "user" &&
      typeof message.content === "string",
  );
  return typeof firstUserMessage?.content === "string"
    ? firstUserMessage.content.slice(0, 90)
    : "Iyeoba AI Planner chat";
}

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isMissingColumnError(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST204" ||
    (message.includes("column") &&
      (message.includes("does not exist") || message.includes("could not find")))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
