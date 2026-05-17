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
        weddingEventsLoadError: false,
        chatHistory: [],
        initialPlannerState: null,
        selectedWeddingId: null,
        selectedChatId: null,
      };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAF9F7_0%,#ffffff_42%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 md:px-10 lg:py-10">
        <section className="surface-card rounded-[1.75rem] p-5 md:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
            Iyeoba AI Planner
          </p>
          <div className="mt-3 max-w-5xl">
            <div>
              <h1 className="font-display text-3xl text-[color:var(--color-ink)] md:text-4xl">
                Plan your wedding with guided steps.
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-[color:var(--color-muted)] md:text-base">
                Share your wedding type, location, guest count, budget, date, and cultural details. Iyeoba AI will shape a practical planning draft, while final traditions, pricing, and vendor availability should be confirmed with families and vendors.
              </p>
            </div>
          </div>
        </section>

        <AiPlannerChat
          isAuthenticated={Boolean(profile)}
          isPlanner={Boolean(profile && profile.role !== "vendor")}
          initialName={profile?.full_name ?? undefined}
          initialState={plannerData.initialPlannerState}
          weddingEvents={plannerData.weddingEvents}
          weddingEventsLoadError={plannerData.weddingEventsLoadError}
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
  weddingEventsLoadError: boolean;
  chatHistory: AiPlannerChatHistoryItem[];
  initialPlannerState: AiPlannerInitialState | null;
  selectedWeddingId: string | null;
  selectedChatId: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const ownerId = await resolveAiPlannerOwnerId(supabase, userId);
  const [weddingEventsResult, chatHistory] = await Promise.all([
    getAiPlannerWeddingEvents(ownerId),
    getAiPlannerChatHistory(ownerId),
  ]);
  const weddingEvents = weddingEventsResult.weddingEvents;
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
    weddingEventsLoadError: weddingEventsResult.loadError,
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

async function getAiPlannerWeddingEvents(
  userId: string,
): Promise<{ weddingEvents: AiPlannerWeddingEvent[]; loadError: boolean }> {
  const supabase = await createSupabaseServerClient();
  const selectAttempts = [
    "id, event_name, wedding_type, culture, location, guest_count, budget_range, wedding_date, created_at",
    "id, title, wedding_type, culture, location, guest_count, budget_range, wedding_date, created_at",
    "id, event_name, wedding_type, culture, location, guest_count, budget_range, created_at",
    "id, title, wedding_type, culture, location, guest_count, budget_range, created_at",
  ] as const;

  let data: Array<Record<string, unknown>> = [];
  let finalError: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null = null;

  for (const select of selectAttempts) {
    const result = await supabase
      .from("weddings")
      .select(select)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!result.error) {
      data = Array.isArray(result.data) ? (result.data as Array<Record<string, unknown>>) : [];
      finalError = null;
      break;
    }

    finalError = {
      code: result.error.code ?? null,
      message: result.error.message ?? null,
      details: result.error.details ?? null,
      hint: result.error.hint ?? null,
    };

    if (!isMissingColumnError(result.error)) {
      break;
    }
  }

  if (finalError) {
    console.warn("Iyeoba AI planner wedding events could not be loaded", {
      layer: "weddings_select",
      code: finalError.code ?? undefined,
      message: finalError.message,
      details: finalError.details ?? undefined,
      hint: finalError.hint ?? undefined,
    });
    return { weddingEvents: [], loadError: true };
  }

  return { weddingEvents: data.map((row) => ({
    id: String(row.id),
    title: buildWeddingTitle(row),
    weddingType: stringValue(row.wedding_type),
    culture: stringValue(row.culture),
    location: stringValue(row.location),
    guestCount: row.guest_count === null ? null : Number(row.guest_count),
    budgetRange: stringValue(row.budget_range),
    weddingDate: stringValue(row.wedding_date) || null,
    createdAt: stringValue(row.created_at) || null,
  })), loadError: false };
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
  title?: string | null;
  culture?: string | null;
  wedding_type?: string | null;
}) {
  return (
    stringValue(row.event_name) ||
    stringValue(row.title) ||
    `${stringValue(row.culture)} ${stringValue(row.wedding_type)}`.trim() ||
    "Wedding event"
  );
}

async function resolveAiPlannerOwnerId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  fallbackId: string,
) {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn("Iyeoba AI planner auth owner resolution failed", {
      fallbackId,
      message: error.message,
    });
    return fallbackId;
  }

  return data.user?.id ?? fallbackId;
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
