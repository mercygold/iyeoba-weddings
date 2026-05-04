import { NextResponse } from "next/server";
import OpenAI from "openai";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PlannerIntake = {
  weddingType?: string;
  location?: string;
  guestCount?: string;
  budget?: string;
  weddingDate?: string;
  culture?: string;
  cultureOrTradition?: string;
};

const systemPrompt = `You are Iyeoba AI Planner, a wedding planning assistant inside Iyeoba Weddings.
Help Nigerian and diaspora users plan traditional, court/civil, white, and combined weddings.
Ask for missing details when needed: wedding type, location, guest count, budget, wedding date/month, and culture/tradition.
Generate practical planning guidance with checklist, budget breakdown, vendor categories, timeline, and next steps.
Respect Nigerian cultural nuance without claiming one tradition applies to every family.
Return strict JSON only.`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const requestId = crypto.randomUUID();
  const configuredModel = process.env.OPENAI_MODEL?.trim();
  const model = configuredModel || "gpt-4o-mini";

  if (!apiKey) {
    console.error("Iyeoba AI planner configuration error", {
      requestId,
      layer: "configuration",
      missingOpenAiApiKey: true,
    });
    return NextResponse.json(
      {
        error:
          "Iyeoba AI is not configured yet. Add OPENAI_API_KEY to the server environment.",
      },
      { status: 503 },
    );
  }

  let body: {
    messages?: ChatMessage[];
    intake?: PlannerIntake;
  };

  try {
    body = await request.json();
  } catch (error) {
    logPlannerError(requestId, "request_validation", error);
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const messages = normalizeMessages(body.messages);
  const intake = normalizeIntake(body.intake);
  const latestUserMessage = messages.findLast((message) => message.role === "user");

  if (!latestUserMessage) {
    console.warn("Iyeoba AI planner validation failed", {
      requestId,
      layer: "request_validation",
      normalizedMessageCount: messages.length,
      hasUserMessage: false,
    });
    return NextResponse.json(
      { error: "Please send a planning question first." },
      { status: 400 },
    );
  }

  const openai = new OpenAI({ apiKey });
  let plan: Record<string, unknown>;

  try {
    console.info("Iyeoba AI planner request received", {
      requestId,
      layer: "configuration",
      hasOpenAiKey: Boolean(apiKey),
      model,
      requestPayloadKeys: Object.keys(body),
      intakeKeys: Object.keys(intake),
      normalizedMessageCount: messages.length,
      hasIntake: hasIntakeValues(intake),
    });

    const response = await createPlannerResponse({
      openai,
      model,
      requestId,
      intake,
      messages,
    });

    try {
      plan = JSON.parse(response.outputText);
    } catch (error) {
      logPlannerError(requestId, "openai_response_parse", error, {
        model: response.model,
        outputLength: response.outputText.length,
      });
      return NextResponse.json(
        {
          error:
            "Iyeoba AI returned an unexpected response. Please try again in a moment.",
        },
        { status: 502 },
      );
    }

    console.info("Iyeoba AI planner OpenAI request succeeded", {
      requestId,
      layer: "openai",
      model: response.model,
      outputLength: response.outputText.length,
    });
  } catch (error) {
    logPlannerError(requestId, "openai", error);

    if (shouldReturnStarterPlan(error)) {
      const fallbackPlan = createStarterPlan(intake, latestUserMessage.content);
      const planWithMetadata = {
        ...fallbackPlan,
        intake,
        providerFallback: true,
      };

      console.warn("Iyeoba AI planner returned starter plan after OpenAI failure", {
        requestId,
        layer: "openai",
        model,
        ...getSafeErrorDetails(error),
      });

      const saved = await saveChatForAuthenticatedUser(
        requestId,
        messages,
        planWithMetadata,
      );

      return NextResponse.json({
        ...fallbackPlan,
        saved,
        providerFallback: true,
        ...(!saved
          ? {
              saveError:
                "Starter plan shown. Full AI planning and saved chat history will resume shortly.",
            }
          : {}),
        ...(process.env.NODE_ENV !== "production"
          ? { diagnostics: getSafeErrorDetails(error) }
          : {}),
      });
    }

    const diagnostics = getSafeErrorDetails(error);
    return NextResponse.json(
      {
        error:
          "Iyeoba AI could not create a plan right now. Please try again in a moment.",
        status: diagnostics.status,
        code: diagnostics.code,
        ...(process.env.NODE_ENV !== "production"
          ? { diagnostics }
          : {}),
      },
      { status: 502 },
    );
  }

  try {
    const planWithIntake = {
      ...plan,
      intake,
    };
    const saved = await saveChatForAuthenticatedUser(requestId, messages, planWithIntake);

    return NextResponse.json({
      ...plan,
      saved,
    });
  } catch (error) {
    logPlannerError(requestId, "supabase_insert", error);
    return NextResponse.json(
      {
        ...plan,
        saved: false,
        saveError:
          "Your plan was generated, but chat history could not be saved.",
      },
      { status: 200 },
    );
  }
}

async function createPlannerResponse({
  openai,
  model,
  requestId,
  intake,
  messages,
}: {
  openai: OpenAI;
  model: string;
  requestId: string;
  intake: PlannerIntake;
  messages: ChatMessage[];
}) {
  try {
    return await requestPlannerResponse({
      openai,
      model,
      requestId,
      intake,
      messages,
    });
  } catch (error) {
    const fallbackModel = "gpt-4o-mini";

    if (model !== fallbackModel && shouldRetryWithFallbackModel(error)) {
      logPlannerError(requestId, "openai", error, {
        model,
        retryingWithModel: fallbackModel,
      });

      return requestPlannerResponse({
        openai,
        model: fallbackModel,
        requestId,
        intake,
        messages,
      });
    }

    throw error;
  }
}

async function requestPlannerResponse({
  openai,
  model,
  requestId,
  intake,
  messages,
}: {
  openai: OpenAI;
  model: string;
  requestId: string;
  intake: PlannerIntake;
  messages: ChatMessage[];
}) {
  console.info("Iyeoba AI planner OpenAI request starting", {
    requestId,
    layer: "openai",
    model,
    normalizedMessageCount: messages.length,
    hasIntake: Boolean(Object.values(intake).some((value) => value.trim())),
  });

  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify({
          intake,
          messages,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "iyeoba_ai_planner_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            reply: { type: "string" },
            checklist: {
              type: "array",
              items: { type: "string" },
            },
            budget_breakdown: {
              type: "array",
              items: { type: "string" },
            },
            vendor_categories: {
              type: "array",
              items: { type: "string" },
            },
            timeline: {
              type: "array",
              items: { type: "string" },
            },
            next_steps: {
              type: "array",
              items: { type: "string" },
            },
            questions: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "reply",
            "checklist",
            "budget_breakdown",
            "vendor_categories",
            "timeline",
            "next_steps",
            "questions",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  return {
    model,
    outputText: response.output_text ?? "",
  };
}

function normalizeMessages(messages: ChatMessage[] | undefined) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 3000),
    }));
}

function normalizeIntake(intake: PlannerIntake | undefined): Required<PlannerIntake> {
  return {
    weddingType: sanitizeIntakeValue(intake?.weddingType),
    location: sanitizeIntakeValue(intake?.location),
    guestCount: sanitizeIntakeValue(intake?.guestCount),
    budget: sanitizeIntakeValue(intake?.budget),
    weddingDate: sanitizeIntakeValue(intake?.weddingDate),
    culture: sanitizeIntakeValue(intake?.culture ?? intake?.cultureOrTradition),
    cultureOrTradition: sanitizeIntakeValue(intake?.cultureOrTradition ?? intake?.culture),
  };
}

function sanitizeIntakeValue(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

function hasIntakeValues(intake: PlannerIntake) {
  return Object.values(intake).some((value) => typeof value === "string" && value.trim());
}

async function saveChatForAuthenticatedUser(
  requestId: string,
  messages: ChatMessage[],
  plan: Record<string, unknown>,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.warn("Iyeoba AI planner auth lookup failed", {
      requestId,
      layer: "auth_session",
      message: authError.message,
      status: authError.status,
    });
  }

  const user = data.user;

  if (!user) {
    console.info("Iyeoba AI planner chat not saved", {
      requestId,
      layer: "auth_session",
      reason: "no_authenticated_user",
    });
    return false;
  }

  const assistantMessage = typeof plan.reply === "string" ? plan.reply : "";
  const title =
    messages.find((message) => message.role === "user")?.content.slice(0, 90) ??
    "Iyeoba AI Planner chat";

  const { error } = await supabase.from("ai_planner_chats").insert({
    user_id: user.id,
    title,
    messages: [
      ...messages,
      {
        role: "assistant",
        content: assistantMessage,
      },
    ],
    plan,
  });

  if (error) {
    console.warn("Iyeoba AI planner chat was not saved", {
      requestId,
      layer: "supabase_insert",
      code: "code" in error ? error.code : undefined,
      message: error.message,
      details: "details" in error ? error.details : undefined,
      hint: "hint" in error ? error.hint : undefined,
    });
    return false;
  }

  console.info("Iyeoba AI planner chat saved", {
    requestId,
    layer: "supabase_insert",
    saved: true,
  });

  return true;
}

function logPlannerError(
  requestId: string,
  layer: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  if (error instanceof Error) {
    const openAiDetails = getSafeErrorDetails(error);

    console.error("Iyeoba AI planner error", {
      requestId,
      layer,
      name: error.name,
      ...openAiDetails,
      ...extra,
    });
    return;
  }

  console.error("Iyeoba AI planner error", {
    requestId,
    layer,
    error,
    ...extra,
  });
}

function getOpenAiErrorDetails(error: Error) {
  const errorRecord = error as Error & {
    status?: number;
    statusCode?: number;
    code?: string;
    type?: string;
    param?: string;
  };

  return {
    status: errorRecord.status ?? errorRecord.statusCode,
    code: errorRecord.code,
    type: errorRecord.type,
    param: errorRecord.param,
  };
}

function getSafeErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      ...getOpenAiErrorDetails(error),
      message: error.message,
    };
  }

  return {
    status: undefined,
    code: undefined,
    type: undefined,
    param: undefined,
    message: "Unknown error",
  };
}

function shouldRetryWithFallbackModel(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const details = getOpenAiErrorDetails(error);
  const message = error.message.toLowerCase();

  return (
    details.status === 400 ||
    details.status === 404 ||
    details.code === "model_not_found" ||
    details.code === "invalid_request_error" ||
    message.includes("model") ||
    message.includes("unsupported")
  );
}

function shouldReturnStarterPlan(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const details = getOpenAiErrorDetails(error);
  const message = error.message.toLowerCase();

  return (
    details.status === 429 ||
    details.code === "insufficient_quota" ||
    details.type === "insufficient_quota" ||
    message.includes("quota") ||
    message.includes("billing") ||
    message.includes("connection error")
  );
}

function createStarterPlan(intake: PlannerIntake, prompt: string) {
  const weddingType = intake.weddingType?.trim() || "your wedding";
  const location = intake.location?.trim() || "your chosen location";
  const guestCount = intake.guestCount?.trim();
  const budget = intake.budget?.trim();
  const weddingDate = intake.weddingDate?.trim();
  const culture = intake.culture?.trim();
  const guestPhrase = guestCount ? ` for about ${guestCount} guests` : "";
  const budgetPhrase = budget ? ` with a working budget of ${budget}` : "";
  const datePhrase = weddingDate ? ` ahead of ${weddingDate}` : "";
  const culturePhrase = culture ? ` while honoring ${culture} traditions` : "";

  return {
    reply: `Iyeoba AI is temporarily unable to reach the planning engine, but here is a practical starter plan for ${weddingType} in ${location}${guestPhrase}${budgetPhrase}${datePhrase}${culturePhrase}. Use this as a first draft, then confirm details with your families and vendors.`,
    checklist: [
      "Confirm wedding type, family priorities, ceremony flow, and any cultural requirements.",
      "Set a realistic budget range and decide which items are highest priority.",
      "Create a guest-count estimate, then split it into family, friends, and VIP groups.",
      "Shortlist vendors for planning, venue, catering, decor, photography, fashion, beauty, music, and logistics.",
      "Collect quotes, compare packages, and confirm what each vendor includes before paying deposits.",
    ],
    budget_breakdown: [
      "Venue, rentals, decor, catering, and drinks are usually the largest cost areas.",
      "Reserve budget for outfits, beauty, photography/video, music/MC, transport, stationery, and gifts.",
      "Keep a 10% to 15% contingency for family additions, logistics changes, and last-minute items.",
    ],
    vendor_categories: [
      "Event planner or coordinator",
      "Venue and hospitality",
      "Catering and small chops",
      "Decor and rentals",
      "Photography and videography",
      "Beauty, grooming, fashion, and aso-oke",
      "Music, DJ, MC, and traditional wedding services",
    ],
    timeline: [
      "Start with budget, guest count, date, and family requirements.",
      "Book high-demand vendors first: venue, planner, catering, photo/video, decor, and music.",
      "Finalize outfits, invitations, logistics, and ceremony details after core vendors are secured.",
      "Confirm final guest count, vendor arrival times, payment balances, and day-of contacts in the final weeks.",
    ],
    next_steps: [
      "Write down your top three non-negotiables for the wedding.",
      "Choose a target date or month if you have not already.",
      "Request quotes from at least three vendors in each priority category.",
      "Come back and send your updated details so Iyeoba AI can refine this into a more specific plan.",
    ],
    questions: [
      "Which ceremony or celebration matters most to your families?",
      "What city or venue area are you prioritizing?",
      "What guest count range feels realistic?",
      "Which vendors do you already have, if any?",
      `What should the plan focus on most based on your prompt: ${prompt.slice(0, 180)}${prompt.length > 180 ? "..." : ""}`,
    ],
  };
}
