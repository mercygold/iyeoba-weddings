"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePlannerProfile } from "@/lib/auth";
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
  const { data: vendorIdentity, error: vendorIdentityError } = await supabase
    .from("vendors")
    .select("id, user_id")
    .eq("id", vendorId)
    .maybeSingle();

  if (vendorIdentityError || !vendorIdentity?.id || !vendorIdentity.user_id) {
    console.error("Planner inquiry create failed while resolving vendor identity", {
      plannerUserId: profile.id,
      vendorId,
      vendorSlug,
      error: vendorIdentityError ? serializeSupabaseError(vendorIdentityError) : null,
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not start this inquiry right now.")}`,
    );
  }

  const existingThread = await findExistingPlannerVendorThread({
    supabase,
    plannerUserId: profile.id,
    vendorUserId: vendorIdentity.user_id,
    vendorId,
  });

  if (existingThread.id) {
    if (message) {
      const now = new Date().toISOString();
      const appended = await appendPlannerMessageToThread({
        supabase,
        inquiryId: existingThread.id,
        plannerUserId: profile.id,
        message,
        now,
      });

      if (!appended.ok) {
        console.error("Planner inquiry append failed", {
          plannerUserId: profile.id,
          vendorId,
          vendorSlug,
          threadId: existingThread.id,
          error: appended.error ? serializeSupabaseError(appended.error) : null,
        });
        redirect(
          `${nextPath}?error=${encodeURIComponent("We could not send your inquiry right now.")}`,
        );
      }

      revalidatePath("/planner/dashboard");
      revalidatePath("/vendor/dashboard");
      redirect(
        `${nextPath}?message=${encodeURIComponent("Message sent in your existing conversation thread.")}`,
      );
    }

    redirect(
      `${nextPath}?message=${encodeURIComponent("Conversation already exists with this vendor.")}`,
    );
  }

  const now = new Date().toISOString();
  const payload = {
    planner_user_id: profile.id,
    vendor_profile_id: vendorId,
    vendor_user_id: vendorIdentity.user_id,
    status: "open",
    initial_message: null,
    updated_at: now,
  };

  console.log("Planner inquiry write attempt", {
    table: "inquiries",
    authUserId: profile.id,
    vendorId,
    vendorSlug,
    payload,
  });

  const inquiryInsertQuery = supabase.from("inquiries").insert(payload) as {
    select?: (columns: string) => {
      single: () => Promise<{
        data: { id: string } | null;
        error: {
          code?: string | null;
          message?: string | null;
          details?: string | null;
          hint?: string | null;
        } | null;
      }>;
    };
  } & Promise<{
    data: { id: string } | null;
    error: {
      code?: string | null;
      message?: string | null;
      details?: string | null;
      hint?: string | null;
    } | null;
  }>;

  const inquiryInsertResult =
    typeof inquiryInsertQuery.select === "function"
      ? await inquiryInsertQuery.select("id").single()
      : await inquiryInsertQuery;

  let insertedInquiryId = inquiryInsertResult.data?.id ?? null;
  const inquiryError = inquiryInsertResult.error;

  if (!inquiryError && !insertedInquiryId) {
    const postInsertThread = await findExistingPlannerVendorThread({
      supabase,
      plannerUserId: profile.id,
      vendorUserId: vendorIdentity.user_id,
      vendorId,
    });
    insertedInquiryId = postInsertThread.id;
  }

  if (inquiryError || !insertedInquiryId) {
    console.error("Planner inquiry create failed", {
      table: "inquiries",
      plannerUserId: profile.id,
      vendorId,
      vendorSlug,
      payload,
      error: inquiryError ? serializeSupabaseError(inquiryError) : null,
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not start this inquiry right now.")}`,
    );
  }

  if (message) {
    const messagePayload = {
      inquiry_id: insertedInquiryId,
      sender_user_id: profile.id,
      message_body: message,
      created_at: now,
    };

    console.log("Planner inquiry message write attempt", {
      table: "inquiry_messages",
      authUserId: profile.id,
      vendorId,
      inquiryId: insertedInquiryId,
      payload: messagePayload,
    });

    const { error: messageError } = await supabase
      .from("inquiry_messages")
      .insert(messagePayload);

    if (messageError) {
      console.error("Planner inquiry message create failed", {
        table: "inquiry_messages",
        authUserId: profile.id,
        vendorId,
        inquiryId: insertedInquiryId,
        payload: messagePayload,
        error: serializeSupabaseError(messageError),
      });
      redirect(
        `${nextPath}?error=${encodeURIComponent("We could not send your inquiry right now.")}`,
      );
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
    .from("inquiries")
    .select("id, planner_user_id")
    .eq("id", inquiryId)
    .maybeSingle();

  if (
    leadError ||
    !lead?.id ||
    lead.planner_user_id !== profile.id
  ) {
    console.error("Planner inquiry status update failed while loading lead", {
      table: "inquiries",
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
  };

  console.log("Planner inquiry status update attempt", {
    table: "inquiries",
    authUserId: profile.id,
    inquiryId,
    requestedStatus,
    payload,
  });

  const { error } = await supabase
    .from("inquiries")
    .update(payload)
    .eq("id", inquiryId)
    .eq("planner_user_id", profile.id);

  if (error) {
    console.error("Planner inquiry status update failed", {
      table: "inquiries",
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


async function findExistingPlannerVendorThread({
  supabase,
  plannerUserId,
  vendorUserId,
  vendorId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  plannerUserId: string;
  vendorUserId: string;
  vendorId: string;
}) {
  const inquiryResult = await supabase
    .from("inquiries")
    .select("id")
    .eq("planner_user_id", plannerUserId)
    .eq("vendor_user_id", vendorUserId)
    .eq("vendor_profile_id", vendorId)
    .order("updated_at", { ascending: false });

  if (inquiryResult.error) {
    return { id: null };
  }

  return { id: inquiryResult.data?.[0]?.id ?? null };
}

async function appendPlannerMessageToThread({
  supabase,
  inquiryId,
  plannerUserId,
  message,
  now,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  inquiryId: string;
  plannerUserId: string;
  message: string;
  now: string;
}) {
  const messageInsert = await supabase.from("inquiry_messages").insert({
    inquiry_id: inquiryId,
    sender_user_id: plannerUserId,
    message_body: message,
    created_at: now,
  });

  if (messageInsert.error) {
    return { ok: false as const, error: messageInsert.error };
  }

  const statusUpdate = await supabase
    .from("inquiries")
    .update({ status: "open", updated_at: now })
    .eq("id", inquiryId)
    .eq("planner_user_id", plannerUserId);

  if (statusUpdate.error) {
    return { ok: false as const, error: statusUpdate.error };
  }

  return { ok: true as const, error: null };
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
