import { NextResponse } from "next/server";

import { trackServerEvent } from "@/lib/analytics-server";

export async function POST(request: Request) {
  const body = await request.json();

  await trackServerEvent({
    eventName: body.eventName,
    source: body.source,
    path: body.path,
    vendorSlug: body.vendorSlug,
    role: body.role,
    payload: body.payload,
  });

  return NextResponse.json({ ok: true });
}
