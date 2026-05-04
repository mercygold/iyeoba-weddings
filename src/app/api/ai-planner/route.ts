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
Generate practical planning guidance with these sections: Plan Summary, Suggested Cultural Elements, Checklist, Budget Breakdown, Vendor Categories Needed, Timeline, Next Steps, and Questions to Confirm.
Respect Nigerian cultural nuance without claiming one tradition applies to every family.
If culture/tradition includes Yoruba, consider family introduction/customary flow, engagement/traditional ceremony elements, Alaga Ijoko/Alaga Iduro where appropriate, aso-ebi coordination, traditional attire changes, family prayers/blessings, talking drum/live band/MC, and traditional food/drinks.
If culture/tradition includes Igbo, consider wine-carrying, family introduction/customary rites, traditional attire, highlife/music/MC, traditional food/drinks, and family blessing moments.
If culture/tradition includes Hausa/Northern, Edo, Efik/Ibibio, intertribal, diaspora, or mixed culture, provide careful general guidance and ask clarifying questions instead of inventing highly specific rites.
If the user says Nigerian diaspora, include remote vendor coordination, a family representative in Nigeria if relevant, currency/budget conversion, travel/accommodation, documentation, and communication timeline.
Use language like "consider", "confirm with family", and "depending on family tradition" for cultural details.
Budget breakdown should be by category. If a budget is provided, include rough estimated amounts and percentage allocations where possible, with a reminder to confirm with vendors and families.
Also return structured budget_summary and budget_allocations for UI rendering. budget_allocations should include venue, catering, decor, photography/videography, attire, makeup/hair, music/MC, cultural ceremony items, transport/logistics, stationery/invitations, and contingency where relevant.
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
      plan = ensureSaveableBudget(plan, intake);
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
              suggested_cultural_elements: {
                type: "array",
                items: { type: "string" },
              },
              checklist: {
                type: "array",
                items: { type: "string" },
            },
            budget_breakdown: {
              type: "array",
              items: { type: "string" },
            },
            budget_summary: {
              type: "object",
              properties: {
                total_budget: { type: "string" },
                allocated_amount: { type: "string" },
                remaining_buffer: { type: "string" },
                note: { type: "string" },
              },
              required: [
                "total_budget",
                "allocated_amount",
                "remaining_buffer",
                "note",
              ],
              additionalProperties: false,
            },
            budget_allocations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  amount: { type: "string" },
                  percentage: { type: "number" },
                },
                required: ["category", "amount", "percentage"],
                additionalProperties: false,
              },
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
              "suggested_cultural_elements",
              "checklist",
              "budget_breakdown",
              "budget_summary",
              "budget_allocations",
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

function ensureSaveableBudget(
  plan: Record<string, unknown>,
  intake: PlannerIntake,
) {
  const hasSummary = Boolean(
    plan.budget_summary &&
      typeof plan.budget_summary === "object" &&
      !Array.isArray(plan.budget_summary),
  );
  const hasAllocations =
    Array.isArray(plan.budget_allocations) && plan.budget_allocations.length > 0;

  if (hasSummary && hasAllocations) {
    return plan;
  }

  const fallback = getBudgetModule(intake.budget, intake.culture, intake.weddingType || "your wedding");
  const budgetBreakdown = Array.isArray(plan.budget_breakdown)
    ? plan.budget_breakdown.filter((item): item is string => typeof item === "string")
    : fallback.breakdown;

  return {
    ...plan,
    budget_breakdown: budgetBreakdown,
    budget_summary: hasSummary ? plan.budget_summary : fallback.summary,
    budget_allocations: hasAllocations
      ? plan.budget_allocations
      : deriveBudgetAllocationsFromBreakdown(
          budgetBreakdown,
          intake.budget,
          fallback.allocations,
        ),
  };
}

function deriveBudgetAllocationsFromBreakdown(
  items: string[],
  budget: string | undefined,
  fallbackAllocations: { category: string; percentage: number; amount: string }[],
) {
  if (!items.length) {
    return fallbackAllocations;
  }

  const amount = parseBudgetAmount(budget);
  const currency = amount?.currency ?? "";
  return items.map((item, index) => {
    const [rawName, ...rest] = item.split(":");
    const category = rest.length ? rawName.trim() : `Budget item ${index + 1}`;
    const note = rest.length ? rest.join(":").trim() : item;
    const percentages = [...item.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((match) =>
      Number(match[1]),
    );
    const percentageMin = percentages.length ? Math.min(...percentages) : null;
    const percentageMax = percentages.length ? Math.max(...percentages) : null;
    const percentage =
      percentageMin !== null && percentageMax !== null && percentageMin === percentageMax
        ? percentageMin
        : percentageMax ?? percentageMin ?? 0;
    const amountMin =
      amount && percentageMin !== null
        ? Math.round(amount.value * (percentageMin / 100))
        : null;
    const amountMax =
      amount && percentageMax !== null
        ? Math.round(amount.value * (percentageMax / 100))
        : amountMin;

    return {
      category,
      amount:
        amountMin !== null && amountMax !== null && amountMin !== amountMax
          ? `${currency}${amountMin.toLocaleString()} to ${currency}${amountMax.toLocaleString()}`
          : amountMin !== null
            ? `${currency}${amountMin.toLocaleString()}`
            : note,
      percentage,
      percentageMin,
      percentageMax,
      amountMin,
      amountMax,
      note,
    };
  });
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
  const culturalElements = getSuggestedCulturalElements(culture, location, weddingType);
  const budgetModule = getBudgetModule(budget, culture, weddingType);
  const guestPhrase = guestCount ? ` for about ${guestCount} guests` : "";
  const budgetPhrase = budget ? ` with a working budget of ${budget}` : "";
  const datePhrase = weddingDate ? ` ahead of ${weddingDate}` : "";
  const culturePhrase = culture ? ` while honoring ${culture} traditions` : "";

  return {
    reply: `Here is a practical starter wedding plan based on your details for ${weddingType} in ${location}${guestPhrase}${budgetPhrase}${datePhrase}${culturePhrase}. Use this as a first draft, then confirm details with your families and vendors.`,
    suggested_cultural_elements: culturalElements,
    checklist: [
      "Confirm wedding type, family priorities, ceremony flow, and any cultural requirements.",
      "Set a realistic budget range and decide which items are highest priority.",
      "Create a guest-count estimate, then split it into family, friends, and VIP groups.",
      "Shortlist vendors for planning, venue, catering, decor, photography, fashion, beauty, music, and logistics.",
      "Collect quotes, compare packages, and confirm what each vendor includes before paying deposits.",
    ],
    budget_breakdown: budgetModule.breakdown,
    budget_summary: budgetModule.summary,
    budget_allocations: budgetModule.allocations,
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

function getSuggestedCulturalElements(
  culture: string | undefined,
  location: string,
  weddingType: string,
) {
  const normalizedCulture = (culture ?? "").toLowerCase();
  const normalizedLocation = location.toLowerCase();
  const elements: string[] = [];

  if (normalizedCulture.includes("yoruba")) {
    elements.push(
      "For a Yoruba celebration, consider a family introduction/customary flow and confirm each step with both families.",
      "If you are having an engagement/traditional ceremony, discuss whether Alaga Ijoko and Alaga Iduro are appropriate for your families.",
      "Plan aso-ebi coordination, traditional attire changes, family prayers/blessings, and timing for the couple's entrance.",
      "Consider talking drum, live band, MC, and traditional food/drinks depending on the tone of the event.",
    );
  }

  if (normalizedCulture.includes("igbo")) {
    elements.push(
      "For an Igbo celebration, consider the wine-carrying ceremony and confirm the customary rites with both families.",
      "Plan traditional attire, family blessing moments, and a clear flow for introductions and formal greetings.",
      "Consider highlife music, MC support, and traditional food/drinks that fit the family and community expectations.",
    );
  }

  if (
    normalizedCulture.includes("hausa") ||
    normalizedCulture.includes("northern") ||
    normalizedCulture.includes("edo") ||
    normalizedCulture.includes("efik") ||
    normalizedCulture.includes("ibibio")
  ) {
    elements.push(
      "For this tradition, confirm the specific family and community expectations before locking the ceremony flow.",
      "Ask both families which customary moments, attire, food, music, prayers, or blessings should be included.",
    );
  }

  if (
    normalizedCulture.includes("intertribal") ||
    normalizedCulture.includes("mixed") ||
    normalizedCulture.includes("diaspora") ||
    normalizedLocation.includes("london") ||
    normalizedLocation.includes("houston") ||
    normalizedLocation.includes("toronto") ||
    normalizedLocation.includes("atlanta") ||
    normalizedLocation.includes("uk") ||
    normalizedLocation.includes("usa") ||
    normalizedLocation.includes("canada")
  ) {
    elements.push(
      "For diaspora or mixed-culture planning, create one shared ceremony brief so families, vendors, and MCs understand the flow.",
      "Plan remote vendor coordination, currency conversion, travel/accommodation, and a communication timeline for family decisions.",
      "If vendors or family representatives are in Nigeria, assign one trusted person to confirm details locally.",
    );
  }

  if (!elements.length) {
    elements.push(
      `For ${weddingType}, confirm the family introduction, blessings, attire expectations, food, music, and ceremony flow with both families.`,
      "Avoid assuming every family follows the same order; use this plan as a guide and confirm the details with elders or family representatives.",
    );
  }

  return elements;
}

function getBudgetModule(
  budget: string | undefined,
  culture: string | undefined,
  weddingType: string,
) {
  const amount = parseBudgetAmount(budget);
  const allocations = getBudgetAllocationPercentages(culture, weddingType);

  if (!amount) {
    return {
      summary: {
        total_budget: "Not provided",
        allocated_amount: "Use the percentages below as a planning guide",
        remaining_buffer: "Keep 10% as contingency where possible",
        note: "Add a budget to see estimated amounts. Confirm actual pricing with vendors and families.",
      },
      allocations: allocations.map((item) => ({
        category: item.category,
        percentage: item.percentage,
        amount: "Estimate after budget is confirmed",
      })),
      breakdown: [
        "Use the category percentages below as a starting point until your budget is confirmed.",
        "Venue, catering, decor, photography/video, attire, beauty, music/MC, cultural ceremony items, logistics, stationery, and contingency should all be considered.",
        "Keep a 10% contingency for guest-count changes, family additions, and last-minute logistics.",
      ],
    };
  }

  const formatAmount = (value: number) => `${amount.currency}${Math.round(value).toLocaleString()}`;
  const allocatedPercentage = allocations
    .filter((item) => item.category.toLowerCase() !== "contingency")
    .reduce((total, item) => total + item.percentage, 0);
  const contingency = allocations.find((item) => item.category.toLowerCase() === "contingency");
  const allocatedAmount = amount.value * (allocatedPercentage / 100);
  const bufferAmount = amount.value * ((contingency?.percentage ?? 0) / 100);

  return {
    summary: {
      total_budget: `${amount.currency}${amount.value.toLocaleString()}`,
      allocated_amount: formatAmount(allocatedAmount),
      remaining_buffer: formatAmount(bufferAmount),
      note: "These are starter estimates. Confirm actual pricing with vendors and families.",
    },
    allocations: allocations.map((item) => ({
      category: item.category,
      percentage: item.percentage,
      amount: formatAmount(amount.value * (item.percentage / 100)),
    })),
    breakdown: [
      `Total budget: ${amount.currency}${amount.value.toLocaleString()}. Estimated allocated amount: ${formatAmount(allocatedAmount)}.`,
      `Recommended contingency/buffer: ${formatAmount(bufferAmount)} for guest-count changes, family additions, and last-minute logistics.`,
      "Review each category with real vendor quotes before making deposits.",
    ],
  };
}

function getBudgetAllocationPercentages(
  culture: string | undefined,
  weddingType: string,
) {
  const normalizedCulture = (culture ?? "").toLowerCase();
  const normalizedWeddingType = weddingType.toLowerCase();
  const isTraditionalHeavy =
    normalizedWeddingType.includes("traditional") ||
    normalizedCulture.includes("yoruba") ||
    normalizedCulture.includes("igbo") ||
    normalizedCulture.includes("hausa") ||
    normalizedCulture.includes("edo") ||
    normalizedCulture.includes("efik") ||
    normalizedCulture.includes("ibibio");

  return [
    { category: "Venue", percentage: normalizedWeddingType.includes("court") ? 8 : 14 },
    { category: "Catering", percentage: 18 },
    { category: "Decor", percentage: normalizedWeddingType.includes("court") ? 7 : 12 },
    { category: "Photography/Videography", percentage: 10 },
    { category: "Attire", percentage: isTraditionalHeavy ? 10 : 8 },
    { category: "Makeup/Hair", percentage: 6 },
    { category: "Music/MC", percentage: isTraditionalHeavy ? 8 : 7 },
    { category: "Cultural Ceremony Items", percentage: isTraditionalHeavy ? 8 : 4 },
    { category: "Transport/Logistics", percentage: 6 },
    { category: "Stationery/Invitations", percentage: 3 },
    { category: "Contingency", percentage: 10 },
  ];
}

function parseBudgetAmount(budget: string | undefined) {
  if (!budget) {
    return null;
  }

  const currency = budget.includes("$")
    ? "$"
    : budget.includes("£")
      ? "£"
      : budget.includes("€")
        ? "€"
        : budget.includes("₦") || /ngn|naira/i.test(budget)
          ? "₦"
          : "";
  const numeric = Number(budget.replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return {
    currency,
    value: numeric,
  };
}
