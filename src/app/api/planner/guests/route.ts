import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getPlannerPrimaryWeddingId } from "@/lib/inquiries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const guestGroups = new Set([
  "Bride family",
  "Groom family",
  "Couple friend",
  "Colleague",
  "Vendor / support",
  "VIP",
  "Other",
]);

const inviteStatuses = new Set([
  "Not invited",
  "Invited",
  "Confirmed",
  "Declined",
  "Maybe",
]);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser();
  const user = authResult.user;

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Sign in to manage your guest list." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid guest list request." },
      { status: 400 },
    );
  }

  const intent = cleanText(body.intent);
  const weddingId = normalizeUuid(body.weddingId) ?? await getPlannerPrimaryWeddingId(user.id);

  if (!weddingId) {
    return NextResponse.json(
      { ok: false, error: "Create or select a wedding event before managing guests." },
      { status: 400 },
    );
  }

  if (intent === "add" || intent === "update") {
    const name = cleanText(body.name);
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Add a guest name before saving." },
        { status: 400 },
      );
    }

    const payload = {
      user_id: user.id,
      wedding_id: weddingId,
      name,
      phone: cleanText(body.phone) || null,
      email: cleanText(body.email) || null,
      guest_group: normalizeGuestGroup(body.guestGroup),
      invite_status: normalizeInviteStatus(body.inviteStatus),
      notes: cleanText(body.notes) || null,
    };

    if (intent === "update") {
      const guestId = normalizeUuid(body.guestId);
      if (!guestId) {
        return NextResponse.json(
          { ok: false, error: "Choose a guest to update." },
          { status: 400 },
        );
      }

      const { error } = await supabase
        .from("guests")
        .update(payload)
        .eq("id", guestId)
        .eq("user_id", user.id)
        .eq("wedding_id", weddingId);

      if (error) {
        return NextResponse.json(
          { ok: false, error: "We could not update this guest right now." },
          { status: 500 },
        );
      }
    } else {
      const { error } = await supabase.from("guests").insert(payload);

      if (error) {
        return NextResponse.json(
          { ok: false, error: "We could not add this guest right now." },
          { status: 500 },
        );
      }
    }

    const guests = await loadGuests(user.id, weddingId);
    revalidatePath("/planner/dashboard");
    return NextResponse.json({
      ok: true,
      message: intent === "update" ? "Guest updated." : "Guest added.",
      guests,
    });
  }

  if (intent === "status") {
    const guestId = normalizeUuid(body.guestId);
    const inviteStatus = normalizeInviteStatus(body.inviteStatus);
    if (!guestId) {
      return NextResponse.json(
        { ok: false, error: "Choose a guest to update." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("guests")
      .update({ invite_status: inviteStatus })
      .eq("id", guestId)
      .eq("user_id", user.id)
      .eq("wedding_id", weddingId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "We could not update this guest status right now." },
        { status: 500 },
      );
    }

    const guests = await loadGuests(user.id, weddingId);
    revalidatePath("/planner/dashboard");
    return NextResponse.json({ ok: true, message: "Invite status updated.", guests });
  }

  if (intent === "delete") {
    const guestId = normalizeUuid(body.guestId);
    if (!guestId) {
      return NextResponse.json(
        { ok: false, error: "Choose a guest to remove." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("guests")
      .delete()
      .eq("id", guestId)
      .eq("user_id", user.id)
      .eq("wedding_id", weddingId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "We could not remove this guest right now." },
        { status: 500 },
      );
    }

    const guests = await loadGuests(user.id, weddingId);
    revalidatePath("/planner/dashboard");
    return NextResponse.json({ ok: true, message: "Guest removed.", guests });
  }

  return NextResponse.json(
    { ok: false, error: "Invalid guest list action." },
    { status: 400 },
  );
}

async function loadGuests(userId: string, weddingId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("guests")
    .select("id, name, phone, email, guest_group, invite_status, notes, created_at, updated_at")
    .eq("user_id", userId)
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((guest) => ({
    id: guest.id,
    name: guest.name,
    phone: guest.phone ?? "",
    email: guest.email ?? "",
    guestGroup: guest.guest_group ?? "Other",
    inviteStatus: guest.invite_status ?? "Not invited",
    notes: guest.notes ?? "",
    createdAt: guest.created_at ?? null,
    updatedAt: guest.updated_at ?? null,
  }));
}

function normalizeGuestGroup(value: unknown) {
  const text = cleanText(value);
  return guestGroups.has(text) ? text : "Other";
}

function normalizeInviteStatus(value: unknown) {
  const text = cleanText(value);
  return inviteStatuses.has(text) ? text : "Not invited";
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

function normalizeUuid(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : null;
}

