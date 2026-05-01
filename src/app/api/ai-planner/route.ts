import { NextResponse } from "next/server";
import OpenAI from "openai";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

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
    intake?: Record<string, string>;
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
    console.info("Iyeoba AI planner OpenAI request starting", {
      requestId,
      layer: "openai",
      model,
      normalizedMessageCount: messages.length,
      hasIntake: Boolean(body.intake),
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
            intake: body.intake ?? {},
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

    try {
      plan = JSON.parse(response.output_text);
    } catch (error) {
      logPlannerError(requestId, "openai_response_parse", error, {
        outputLength: response.output_text?.length ?? 0,
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
      outputLength: response.output_text?.length ?? 0,
    });
  } catch (error) {
    logPlannerError(requestId, "openai", error);
    return NextResponse.json(
      {
        error:
          "Iyeoba AI could not create a plan right now. Please try again in a moment.",
      },
      { status: 502 },
    );
  }

  try {
    const saved = await saveChatForAuthenticatedUser(requestId, messages, plan);

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
    const openAiDetails = getOpenAiErrorDetails(error);

    console.error("Iyeoba AI planner error", {
      requestId,
      layer,
      name: error.name,
      message: error.message,
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
