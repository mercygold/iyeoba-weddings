"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePlannerProfile } from "@/lib/auth";
import { getPlannerPrimaryWeddingId } from "@/lib/inquiries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveVendorForPlannerAction(formData: FormData) {
  const profile = await requirePlannerProfile("/planner/dashboard");
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const nextPath = normalizePlannerNextPath(
    String(formData.get("nextPath") ?? "/planner/dashboard").trim(),
  );
  const supabase = await createSupabaseServerClient();

  if (!vendorId) {
    redirect(`${nextPath}?error=${encodeURIComponent("Vendor record was not found.")}`);
  }

  const payload = {
    user_id: profile.id,
    vendor_id: vendorId,
  };
  console.log("Planner save vendor write attempt", {
    table: "saved_vendors",
    authUserId: profile.id,
    payload,
  });

  const { error } = await supabase.from("saved_vendors").upsert(payload, {
    onConflict: "user_id,vendor_id",
    ignoreDuplicates: false,
  });

  if (error) {
    console.error("Planner save vendor failed", {
      table: "saved_vendors",
      plannerUserId: profile.id,
      vendorId,
      payload,
      error: serializeSupabaseError(error),
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not save this vendor right now.")}`,
    );
  }

  revalidatePath("/planner/dashboard");
  revalidatePath("/vendors");
  redirect(
    `${nextPath}?message=${encodeURIComponent("Vendor saved to your Planner.")}`,
  );
}

export async function createVendorInquiryAction(formData: FormData) {
  const profile = await requirePlannerProfile("/planner/dashboard");
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const vendorSlug = String(formData.get("vendorSlug") ?? "").trim();
  const nextPath = normalizePlannerNextPath(
    String(formData.get("nextPath") ?? "/planner/dashboard").trim(),
  );
  const contactMethod = String(formData.get("contactMethod") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const supabase = await createSupabaseServerClient();

  if (!vendorId || !vendorSlug) {
    console.error("Planner inquiry validation failed", {
      plannerUserId: profile.id,
      vendorId,
      vendorSlug,
      reason: "missing_vendor_reference",
    });
    redirect(`${nextPath}?error=${encodeURIComponent("Vendor record was not found.")}`);
  }
  const weddingId = await getPlannerPrimaryWeddingId(profile.id);
  const payload = {
    user_id: profile.id,
    planner_user_id: profile.id,
    vendor_id: vendorId,
    wedding_id: weddingId,
    contact_method: contactMethod || null,
    message: message || null,
    status: "new",
    thread_status: "open",
  };

  console.log("Planner inquiry write attempt", {
    table: "leads",
    authUserId: profile.id,
    vendorId,
    vendorSlug,
    payload,
  });

  const insertAttempts = [
    payload,
    { ...payload, thread_status: undefined },
    { ...payload, contact_method: undefined },
    { ...payload, contact_method: undefined, thread_status: undefined },
    {
      user_id: profile.id,
      vendor_id: vendorId,
      wedding_id: weddingId,
      message: message || null,
      status: "new",
    },
  ].map(stripUndefinedFields);

  let insertedLeadId: string | null = null;
  let error: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  } | null = null;

  for (const attemptPayload of insertAttempts) {
    const leadInsertQuery = supabase.from("leads").insert(attemptPayload) as {
      select?: (columns: string) => { single: () => Promise<{ data: { id: string } | null; error: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null }> };
    } & Promise<{
      data: { id: string } | null;
      error: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null;
    }>;

    const result =
      typeof leadInsertQuery.select === "function"
        ? await leadInsertQuery.select("id").single()
        : await leadInsertQuery;

    insertedLeadId = result.data?.id ?? null;
    error = result.error;

    if (!error && insertedLeadId) {
      break;
    }

    if (error && !isSchemaDriftError(error)) {
      break;
    }

    if (error) {
      console.warn("Planner inquiry insert retrying with compatible payload", {
        table: "leads",
        authUserId: profile.id,
        vendorId,
        vendorSlug,
        payload: attemptPayload,
        error: serializeSupabaseError(error),
      });
    }
  }

  if (error) {
    console.error("Planner inquiry create failed", {
      table: "leads",
      plannerUserId: profile.id,
      vendorId,
      vendorSlug,
      payload,
      error: serializeSupabaseError(error),
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not start this inquiry right now.")}`,
    );
  }

  if (insertedLeadId && message) {
    const messagePayload = {
      lead_id: insertedLeadId,
      sender_user_id: profile.id,
      message,
      body: message,
      created_at: new Date().toISOString(),
    };

    console.log("Planner inquiry message write attempt", {
      table: "lead_messages",
      authUserId: profile.id,
      vendorId,
      leadId: insertedLeadId,
      payload: messagePayload,
    });

    const { error: messageError } = await supabase
      .from("lead_messages")
      .insert(messagePayload);

    if (messageError) {
      const fallbackPayload = {
        lead_id: insertedLeadId,
        sender_user_id: profile.id,
        message,
      };

      console.warn("Planner inquiry message retrying with fallback payload", {
        table: "lead_messages",
        authUserId: profile.id,
        vendorId,
        leadId: insertedLeadId,
        payload: fallbackPayload,
        error: serializeSupabaseError(messageError),
      });

      const fallbackResult = await supabase
        .from("lead_messages")
        .insert(fallbackPayload);

      if (!fallbackResult.error) {
        revalidatePath("/planner/dashboard");
        revalidatePath("/vendor/dashboard");
        redirect(
          `${nextPath}?message=${encodeURIComponent("Inquiry created. You can now contact this vendor directly.")}`,
        );
      }

      console.error("Planner inquiry message create failed", {
        table: "lead_messages",
        authUserId: profile.id,
        vendorId,
        leadId: insertedLeadId,
        payload: fallbackPayload,
        error: serializeSupabaseError(fallbackResult.error ?? messageError),
      });
    }
  }

  revalidatePath("/planner/dashboard");
  revalidatePath("/vendor/dashboard");
  redirect(
    `${nextPath}?message=${encodeURIComponent("Inquiry created. You can now contact this vendor directly.")}`,
  );
}

export async function updatePlannerInquiryStatusAction(formData: FormData) {
  const profile = await requirePlannerProfile("/planner/dashboard");
  const inquiryId = String(formData.get("inquiryId") ?? "").trim();
  const requestedStatus = String(formData.get("status") ?? "").trim();
  const nextPath = normalizePlannerNextPath(
    String(formData.get("nextPath") ?? "/planner/dashboard").trim(),
  );
  const allowedStatuses = new Set(["open", "contacted", "closed", "archived"]);
  const supabase = await createSupabaseServerClient();

  if (!inquiryId || !allowedStatuses.has(requestedStatus)) {
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not update this inquiry right now.")}`,
    );
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, user_id, planner_user_id")
    .eq("id", inquiryId)
    .maybeSingle();

  if (
    leadError ||
    !lead?.id ||
    (lead.user_id !== profile.id && lead.planner_user_id !== profile.id)
  ) {
    console.error("Planner inquiry status update failed while loading lead", {
      table: "leads",
      authUserId: profile.id,
      inquiryId,
      requestedStatus,
      error: serializeSupabaseError(leadError ?? {}),
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not update this inquiry right now.")}`,
    );
  }

  const now = new Date().toISOString();
  const payload = {
    status: requestedStatus,
    updated_at: now,
    contacted_at: requestedStatus === "contacted" ? now : null,
    archived_at: requestedStatus === "archived" ? now : null,
  };

  console.log("Planner inquiry status update attempt", {
    table: "leads",
    authUserId: profile.id,
    inquiryId,
    requestedStatus,
    payload,
  });

  let { error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", inquiryId);

  if (error && isSchemaDriftError(error)) {
    const fallbackPayload = {
      status: mapThreadStatusToLegacyStatus(requestedStatus),
      updated_at: now,
      contacted_at: requestedStatus === "contacted" ? now : null,
      archived_at: requestedStatus === "archived" ? now : null,
    };

    console.warn("Planner inquiry status retrying with compatibility payload", {
      table: "leads",
      authUserId: profile.id,
      inquiryId,
      requestedStatus,
      payload: fallbackPayload,
      error: serializeSupabaseError(error),
    });

    const fallbackResult = await supabase
      .from("leads")
      .update(fallbackPayload)
      .eq("id", inquiryId);
    error = fallbackResult.error;
  }

  if (error) {
    console.error("Planner inquiry status update failed", {
      table: "leads",
      authUserId: profile.id,
      inquiryId,
      requestedStatus,
      payload,
      error: serializeSupabaseError(error),
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not update this inquiry right now.")}`,
    );
  }

  revalidatePath("/planner/dashboard");
  revalidatePath("/vendor/dashboard");
  redirect(
    `${nextPath}?message=${encodeURIComponent("Inquiry status updated.")}`,
  );
}

function isSchemaDriftError(error: {
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

function serializeSupabaseError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function mapThreadStatusToLegacyStatus(
  value: string,
): "new" | "contacted" | "booked" {
  if (value === "contacted") {
    return "contacted";
  }
  if (value === "closed" || value === "archived") {
    return "booked";
  }
  return "new";
}

function stripUndefinedFields<T extends Record<string, unknown>>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as T;
}

function normalizePlannerNextPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) {
    return "/planner/dashboard";
  }

  const hashIndex = trimmed.indexOf("#");
  const withoutHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const queryIndex = withoutHash.indexOf("?");
  const withoutQuery = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  if (!withoutQuery.startsWith("/")) {
    return "/planner/dashboard";
  }

  return withoutQuery || "/planner/dashboard";
}
