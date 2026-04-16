import { NextResponse } from "next/server";
import OpenAI from "openai";

const systemPrompt = `You are an AI wedding planning assistant for Iyeoba Weddings.
Return strict JSON with keys: summary, checklist, vendor_categories, timeline, missing_items.
Each checklist, vendor_categories, timeline, and missing_items value must be an array of strings.`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Missing OPENAI_API_KEY. Add it to your environment variables.",
      },
      { status: 500 },
    );
  }

  const body = await request.json();
  const openai = new OpenAI({ apiKey });

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(body),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "wedding_blueprint",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            checklist: {
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
            missing_items: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "summary",
            "checklist",
            "vendor_categories",
            "timeline",
            "missing_items",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const output = response.output_text;

  return new NextResponse(output, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
