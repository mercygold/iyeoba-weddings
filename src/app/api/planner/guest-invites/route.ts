import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getPlannerPrimaryWeddingId } from "@/lib/inquiries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const guestGroups = new Set([
  "Bride family",
  "Groom family",
  "Friend",
  "Couple friend",
  "Colleague",
  "Vendor",
  "Vendor / support",
  "VIP",
  "Other",
]);

type GuestInvitePayload = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestGroup: string;
  coupleName: string;
  weddingDate: string;
  weddingTime: string;
  venue: string;
  customMessage: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser();
  const user = authResult.user;

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Sign in to manage guest invites." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid guest invite request." },
      { status: 400 },
    );
  }

  const intent = cleanText(body.intent);
  const weddingId = normalizeUuid(body.weddingId) ?? await getPlannerPrimaryWeddingId(user.id);

  if (!weddingId) {
    return NextResponse.json(
      { ok: false, error: "Create or select a wedding event before sending invites." },
      { status: 400 },
    );
  }

  if (intent === "delete") {
    const inviteId = normalizeUuid(body.inviteId);
    if (!inviteId) {
      return NextResponse.json(
        { ok: false, error: "Choose an invite to remove." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("guest_invites")
      .delete()
      .eq("id", inviteId)
      .eq("planner_user_id", user.id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "We could not remove this invite right now." },
        { status: 500 },
      );
    }

    revalidatePath("/planner/dashboard");
    return NextResponse.json({
      ok: true,
      message: "Invite removed.",
      invites: await loadInvites(user.id, weddingId),
      guests: await loadGuests(user.id, weddingId),
    });
  }

  if (intent !== "save" && intent !== "send") {
    return NextResponse.json(
      { ok: false, error: "Invalid guest invite action." },
      { status: 400 },
    );
  }

  const payload = normalizeInvitePayload(body);
  const validationError = validateInvitePayload(payload);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const guestId = normalizeUuid(body.guestId);
  const inviteId = normalizeUuid(body.inviteId);

  const guestRow = {
    user_id: user.id,
    wedding_id: weddingId,
    name: payload.guestName,
    phone: payload.guestPhone || null,
    email: payload.guestEmail,
    guest_group: normalizeGuestGroup(payload.guestGroup),
    invite_status: intent === "send" ? "Invited" : "Not invited",
    notes: null,
  };

  if (guestId) {
    const { error } = await supabase
      .from("guests")
      .update(guestRow)
      .eq("id", guestId)
      .eq("user_id", user.id)
      .eq("wedding_id", weddingId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "We could not save this guest before sending the invite." },
        { status: 500 },
      );
    }
  } else {
    const { data: existingGuest } = await supabase
      .from("guests")
      .select("id")
      .eq("user_id", user.id)
      .eq("wedding_id", weddingId)
      .eq("email", payload.guestEmail)
      .maybeSingle();

    const { error } = existingGuest?.id
      ? await supabase
          .from("guests")
          .update(guestRow)
          .eq("id", existingGuest.id)
          .eq("user_id", user.id)
          .eq("wedding_id", weddingId)
      : await supabase.from("guests").insert(guestRow);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "We could not save this guest before sending the invite." },
        { status: 500 },
      );
    }
  }

  const inviteRow = {
    planner_user_id: user.id,
    wedding_id: weddingId,
    guest_name: payload.guestName,
    guest_email: payload.guestEmail,
    guest_phone: payload.guestPhone || null,
    guest_group: normalizeGuestGroup(payload.guestGroup),
    couple_name: payload.coupleName,
    wedding_date: payload.weddingDate || null,
    wedding_time: payload.weddingTime || null,
    venue: payload.venue || null,
    custom_message: payload.customMessage || null,
    invite_status: "draft",
  };

  const savedInvite = inviteId
    ? await updateInvite(supabase, inviteId, user.id, inviteRow)
    : await createInvite(supabase, { ...inviteRow, rsvp_token: createRsvpToken() });

  if (savedInvite.error || !savedInvite.data) {
    console.warn("Guest invite save failed", {
      intent,
      plannerUserId: user.id,
      weddingId,
      inviteId,
      code: savedInvite.error?.code ?? null,
      message: savedInvite.error?.message ?? null,
      details: savedInvite.error?.details ?? null,
      hint: savedInvite.error?.hint ?? null,
    });
    return NextResponse.json(
      { ok: false, error: intent === "send" ? "We could not send this invite right now." : "We could not save this invite right now." },
      { status: 500 },
    );
  }

  if (intent === "save") {
    revalidatePath("/planner/dashboard");
    return NextResponse.json({
      ok: true,
      message: "Guest invite saved.",
      invites: await loadInvites(user.id, weddingId),
      guests: await loadGuests(user.id, weddingId),
    });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    await markInviteFailed(supabase, savedInvite.data.id, user.id);
    return NextResponse.json(
      {
        ok: false,
        error: "Email sending is not configured yet.",
        invites: await loadInvites(user.id, weddingId),
        guests: await loadGuests(user.id, weddingId),
      },
      { status: 500 },
    );
  }

  const baseUrl = getBaseUrl(request);
  const emailResult = await sendInviteEmail({
    apiKey: resendKey,
    to: payload.guestEmail,
    subject: `You’re invited to ${payload.coupleName}’s Wedding 💜`,
    html: buildInviteEmailHtml({
      ...payload,
      confirmUrl: `${baseUrl}/rsvp/${encodeURIComponent(savedInvite.data.rsvp_token)}?response=confirmed`,
      declineUrl: `${baseUrl}/rsvp/${encodeURIComponent(savedInvite.data.rsvp_token)}?response=declined`,
    }),
  });

  if (!emailResult.ok) {
    console.warn("Guest invite email failed", {
      inviteId: savedInvite.data.id,
      status: emailResult.status,
      error: emailResult.error,
    });
    await markInviteFailed(supabase, savedInvite.data.id, user.id);
    const errorMessage = isResendSenderConfigError(emailResult.error)
      ? "Invite email could not be sent. Please check the sender email configuration."
      : "We could not send this invite right now.";
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
        invites: await loadInvites(user.id, weddingId),
        guests: await loadGuests(user.id, weddingId),
      },
      { status: 500 },
    );
  }

  await supabase
    .from("guest_invites")
    .update({ invite_status: "sent", sent_at: new Date().toISOString() })
    .eq("id", savedInvite.data.id)
    .eq("planner_user_id", user.id);

  revalidatePath("/planner/dashboard");
  return NextResponse.json({
    ok: true,
    message: "Invite email sent.",
    invites: await loadInvites(user.id, weddingId),
    guests: await loadGuests(user.id, weddingId),
  });
}

function normalizeInvitePayload(body: Record<string, unknown>): GuestInvitePayload {
  return {
    guestName: cleanText(body.guestName),
    guestEmail: cleanText(body.guestEmail).toLowerCase(),
    guestPhone: cleanText(body.guestPhone),
    guestGroup: normalizeGuestGroup(body.guestGroup),
    coupleName: cleanText(body.coupleName),
    weddingDate: cleanText(body.weddingDate),
    weddingTime: cleanText(body.weddingTime),
    venue: cleanText(body.venue),
    customMessage: cleanText(body.customMessage, 4000),
  };
}

function validateInvitePayload(payload: GuestInvitePayload) {
  if (!payload.guestName) return "Add a guest name before sending an invite.";
  if (!payload.guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.guestEmail)) {
    return "Add a valid guest email before sending an invite.";
  }
  if (!payload.coupleName) return "Add the couple name before sending an invite.";
  return null;
}

async function createInvite(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, payload: Record<string, unknown>) {
  const guestInvites = supabase.from("guest_invites") as any;
  return guestInvites.insert(payload).select("id, rsvp_token").single();
}

async function updateInvite(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  inviteId: string,
  userId: string,
  payload: Record<string, unknown>,
) {
  const guestInvites = supabase.from("guest_invites") as any;
  return guestInvites
    .update(payload)
    .eq("id", inviteId)
    .eq("planner_user_id", userId)
    .select("id, rsvp_token")
    .single();
}

async function markInviteFailed(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  inviteId: string,
  userId: string,
) {
  await supabase
    .from("guest_invites")
    .update({ invite_status: "failed" })
    .eq("id", inviteId)
    .eq("planner_user_id", userId);
}

async function loadInvites(userId: string, weddingId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("guest_invites")
    .select("id, guest_name, guest_email, guest_phone, guest_group, couple_name, wedding_date, wedding_time, venue, custom_message, invite_status, rsvp_status, rsvp_token, sent_at, created_at, updated_at")
    .eq("planner_user_id", userId)
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((invite) => ({
    id: invite.id,
    guestName: invite.guest_name ?? "",
    guestEmail: invite.guest_email ?? "",
    guestPhone: invite.guest_phone ?? "",
    guestGroup: invite.guest_group ?? "Other",
    coupleName: invite.couple_name ?? "",
    weddingDate: invite.wedding_date ?? "",
    weddingTime: invite.wedding_time ?? "",
    venue: invite.venue ?? "",
    customMessage: invite.custom_message ?? "",
    inviteStatus: invite.invite_status ?? "draft",
    rsvpStatus: invite.rsvp_status ?? "pending",
    rsvpToken: invite.rsvp_token ?? "",
    sentAt: invite.sent_at ?? null,
    createdAt: invite.created_at ?? null,
    updatedAt: invite.updated_at ?? null,
  }));
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

async function sendInviteEmail({
  apiKey,
  to,
  subject,
  html,
}: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
}) {
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL?.trim() || "Iyeoba Weddings <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Resend request failed",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: await response.text().catch(() => "Unknown Resend error"),
    };
  }

  return { ok: true, status: response.status, error: null };
}

function isResendSenderConfigError(error: string | null) {
  const text = (error || "").toLowerCase();
  return text.includes("domain") || text.includes("sender") || text.includes("from") || text.includes("verify");
}

function buildInviteEmailHtml({
  guestName,
  coupleName,
  weddingDate,
  weddingTime,
  venue,
  customMessage,
  confirmUrl,
  declineUrl,
}: GuestInvitePayload & { confirmUrl: string; declineUrl: string }) {
  const safeCustomMessage = customMessage
    ? `<p style="margin:24px 0 0;color:#4A3B52;font-size:16px;line-height:1.7;">${escapeHtml(customMessage).replace(/\n/g, "<br />")}</p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#FAF9F7;padding:28px 14px;font-family:Georgia,'Times New Roman',serif;color:#2F2335;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #E8DEC9;border-radius:28px;overflow:hidden;">
      <div style="background:#5B2C83;padding:26px 28px;text-align:center;">
        <p style="margin:0;color:#E4C27A;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;font-family:Arial,sans-serif;">Iyeoba Weddings</p>
        <h1 style="margin:12px 0 0;color:#ffffff;font-size:30px;line-height:1.2;font-weight:500;">You're invited</h1>
      </div>
      <div style="padding:30px 28px;">
        <p style="margin:0;color:#2F2335;font-size:18px;line-height:1.7;">Hi ${escapeHtml(guestName)},</p>
        <p style="margin:16px 0 0;color:#4A3B52;font-size:16px;line-height:1.7;">You've been warmly invited to celebrate ${escapeHtml(coupleName)}'s wedding.</p>
        <div style="margin:24px 0 0;border:1px solid #E8DEC9;border-radius:20px;padding:18px;background:#FFFDF8;">
          <p style="margin:0 0 8px;color:#5B2C83;font-size:15px;"><strong>Date:</strong> ${escapeHtml(weddingDate || "To be shared")}</p>
          <p style="margin:0 0 8px;color:#5B2C83;font-size:15px;"><strong>Time:</strong> ${escapeHtml(weddingTime || "To be shared")}</p>
          <p style="margin:0;color:#5B2C83;font-size:15px;"><strong>Venue:</strong> ${escapeHtml(venue || "To be shared")}</p>
        </div>
        ${safeCustomMessage}
        <p style="margin:24px 0 0;color:#4A3B52;font-size:16px;line-height:1.7;">Please confirm if you'll be attending.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0 0;">
          <tr>
            <td width="50%" style="padding-right:7px;">
              <a href="${escapeHtml(confirmUrl)}" style="display:block;text-align:center;background:#5B2C83;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 16px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;">Confirm Attendance</a>
            </td>
            <td width="50%" style="padding-left:7px;">
              <a href="${escapeHtml(declineUrl)}" style="display:block;text-align:center;background:#ffffff;color:#5B2C83;text-decoration:none;border:1px solid #C9A15B;border-radius:999px;padding:13px 16px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;">Decline</a>
            </td>
          </tr>
        </table>
        <p style="margin:28px 0 0;color:#4A3B52;font-size:16px;line-height:1.7;">With love,<br />${escapeHtml(coupleName)}</p>
      </div>
      <div style="border-top:1px solid #E8DEC9;padding:18px 28px;text-align:center;">
        <p style="margin:0;color:#7D7185;font-family:Arial,sans-serif;font-size:12px;">Sent through Iyeoba Weddings</p>
      </div>
    </div>
  </body>
</html>`;
}

function getBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || new URL(request.url).origin;
}

function createRsvpToken() {
  return randomBytes(24).toString("hex");
}

function normalizeGuestGroup(value: unknown) {
  const text = cleanText(value);
  return guestGroups.has(text) ? text : "Other";
}

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeUuid(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
