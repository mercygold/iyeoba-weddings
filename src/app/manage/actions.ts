"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MANAGE_PATH = "/manage";

export async function updateManageVendorStatusAction(formData: FormData) {
  await requireAdmin("/manage");
  const nextPath = normalizeManageNextPath(formData.get("nextPath"));
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const requested = String(formData.get("status") ?? "").trim();
  const mappedStatus = mapManageStatus(requested);

  if (!vendorId || !mappedStatus) {
    redirect(withManageQueryParam(nextPath, "message", "Invalid vendor status request."));
  }

  await setVendorStatus(vendorId, mappedStatus);
  redirect(withManageQueryParam(nextPath, "message", "Vendor status updated."));
}

export async function approveVendorAction(formData: FormData) {
  await requireAdmin("/manage");
  const nextPath = normalizeManageNextPath(formData.get("nextPath"));
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  if (!vendorId) {
    redirect(withManageQueryParam(nextPath, "message", "Vendor record was not found."));
  }
  await setVendorStatus(vendorId, "approved");
  redirect(withManageQueryParam(nextPath, "message", "Vendor approved."));
}

export async function rejectVendorAction(formData: FormData) {
  await requireAdmin("/manage");
  const nextPath = normalizeManageNextPath(formData.get("nextPath"));
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  if (!vendorId) {
    redirect(withManageQueryParam(nextPath, "message", "Vendor record was not found."));
  }
  await setVendorStatus(vendorId, "rejected");
  redirect(withManageQueryParam(nextPath, "message", "Vendor rejected."));
}

export async function setVendorPendingAction(formData: FormData) {
  await requireAdmin("/manage");
  const nextPath = normalizeManageNextPath(formData.get("nextPath"));
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  if (!vendorId) {
    redirect(withManageQueryParam(nextPath, "message", "Vendor record was not found."));
  }
  await setVendorStatus(vendorId, "pending_review");
  redirect(withManageQueryParam(nextPath, "message", "Vendor marked pending review."));
}

export async function addManageVendorNoteAction(formData: FormData) {
  const admin = await requireAdmin("/manage");
  const nextPath = normalizeManageNextPath(formData.get("nextPath"));

  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!vendorId || !note) {
    redirect(withManageQueryParam(nextPath, "message", "Add a valid note before saving."));
  }

  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const writeClient = adminClient ?? supabase;

  let vendorUpdateResult = await writeClient
    .from("vendors")
    .update({
      admin_notes: note,
      last_reviewed_at: new Date().toISOString(),
      reviewed_by: admin.userId,
    })
    .eq("id", vendorId)
    .select("id, user_id, business_name, admin_notes")
    .maybeSingle();

  if (vendorUpdateResult.error && isMissingColumnError(vendorUpdateResult.error)) {
    vendorUpdateResult = await writeClient
      .from("vendors")
      .update({
        admin_notes: note,
      })
      .eq("id", vendorId)
      .select("id, user_id, business_name, admin_notes")
      .maybeSingle();
  }

  if (vendorUpdateResult.error) {
    redirect(withManageQueryParam(nextPath, "message", vendorUpdateResult.error.message));
  }

  if (!vendorUpdateResult.data?.id) {
    redirect(withManageQueryParam(nextPath, "message", "Vendor record was not found."));
  }

  console.log("Admin note saved to vendor row", {
    vendorId: vendorUpdateResult.data.id,
    vendorUserId: vendorUpdateResult.data.user_id ?? null,
    businessName: vendorUpdateResult.data.business_name ?? null,
    adminNotes: vendorUpdateResult.data.admin_notes ?? null,
  });

  const insertResult = await writeClient.from("admin_notes").insert({
    vendor_id: vendorId,
    admin_id: admin.userId,
    note,
  });

  if (insertResult.error && !isMissingTableError(insertResult.error)) {
    console.warn("Admin note history insert skipped", {
      vendorId,
      error: serializeManageError(insertResult.error),
    });
  }

  revalidatePath("/manage");
  revalidatePath("/vendor/dashboard");
  redirect(withManageQueryParam(nextPath, "message", "Admin note saved."));
}

export async function updateHomepageCarouselVendorAction(formData: FormData) {
  await requireAdmin("/manage");
  const nextPath = normalizeManageNextPath(formData.get("nextPath"));
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const showInCarousel = formData.get("homepageCarousel") === "1";
  const homepageOrder = parseHomepageOrder(formData.get("homepageOrder"));

  if (!vendorId) {
    redirect(withManageQueryParam(nextPath, "message", "Vendor record was not found."));
  }

  if (homepageOrder === false) {
    redirect(withManageQueryParam(nextPath, "message", "Homepage carousel position must be blank or a number from 1 to 10."));
  }

  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const writeClient = adminClient ?? supabase;

  const { data: vendor, error: vendorError } = await writeClient
    .from("vendors")
    .select("id, status, profile_status, approved")
    .eq("id", vendorId)
    .maybeSingle();

  if (vendorError || !vendor?.id) {
    redirect(withManageQueryParam(nextPath, "message", vendorError?.message ?? "Vendor record was not found."));
  }

  const isApproved =
    vendor.status === "approved" ||
    vendor.profile_status === "approved" ||
    vendor.approved === true;

  const payload = {
    homepage_carousel: isApproved ? showInCarousel : false,
    homepage_order: isApproved && showInCarousel ? homepageOrder : null,
  };

  const { error } = await writeClient
    .from("vendors")
    .update(payload)
    .eq("id", vendorId);

  if (error) {
    redirect(withManageQueryParam(nextPath, "message", formatHomepageCarouselSaveError(error.message)));
  }

  revalidatePath("/manage");
  revalidatePath("/");
  redirect(withManageQueryParam(nextPath, "message", "Homepage carousel settings saved."));
}

export async function updateTikTokFeatureRequestAction(formData: FormData) {
  await requireAdmin("/manage");
  const nextPath = normalizeManageNextPath(formData.get("nextPath"));
  const requestId = String(formData.get("requestId") ?? "").trim();
  const status = normalizeTikTokFeatureRequestStatus(formData.get("status"));
  const adminNotes = String(formData.get("adminNotes") ?? "").trim();
  const scheduledFor = String(formData.get("scheduledFor") ?? "").trim();
  const postedAt = String(formData.get("postedAt") ?? "").trim();

  if (!requestId || !status) {
    redirect(withManageQueryParam(nextPath, "message", "Invalid TikTok request update."));
  }

  const adminClient = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();
  const writeClient = adminClient ?? supabase;
  const now = new Date().toISOString();
  const payload = {
    status,
    admin_notes: adminNotes || null,
    scheduled_for:
      status === "scheduled" && scheduledFor
        ? new Date(scheduledFor).toISOString()
        : null,
    posted_at:
      status === "posted"
        ? postedAt
          ? new Date(postedAt).toISOString()
          : now
        : null,
    updated_at: now,
  };

  const { error } = await writeClient
    .from("vendor_tiktok_feature_requests")
    .update(payload)
    .eq("id", requestId);

  if (error) {
    redirect(withManageQueryParam(nextPath, "message", error.message));
  }

  revalidatePath("/manage");
  revalidatePath("/vendor/dashboard");
  redirect(withManageQueryParam(nextPath, "message", "TikTok feature request updated."));
}

function mapManageStatus(value: string) {
  if (value === "approved") return "approved";
  if (value === "pending_review") return "pending_review";
  if (value === "rejected") return "rejected";
  return null;
}

function normalizeTikTokFeatureRequestStatus(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (
    value === "pending_review" ||
    value === "needs_changes" ||
    value === "approved" ||
    value === "scheduled" ||
    value === "posted" ||
    value === "not_eligible" ||
    value === "cancelled"
  ) {
    return value;
  }
  return null;
}

async function setVendorStatus(vendorId: string, status: "pending_review" | "approved" | "rejected") {
  const admin = await requireAdmin(MANAGE_PATH);
  const supabase = await createSupabaseServerClient();
  const { data: existingVendor } = await supabase
    .from("vendors")
    .select("id, status, profile_status, approved, approved_at")
    .eq("id", vendorId)
    .maybeSingle();
  const now = new Date().toISOString();
  const isApproved = status === "approved";
  const wasApproved =
    existingVendor?.status === "approved" ||
    existingVendor?.profile_status === "approved" ||
    existingVendor?.approved === true;
  const statusPayload = {
    status,
    profile_status: status,
    approved: isApproved,
    verified: isApproved,
    ...(isApproved && !wasApproved && !existingVendor?.approved_at
      ? { approved_at: now }
      : {}),
    last_reviewed_at: now,
    reviewed_by: admin.userId,
  };
  let result = await supabase
    .from("vendors")
    .update(statusPayload)
    .eq("id", vendorId);

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from("vendors")
      .update({
        status,
        profile_status: status,
        approved: isApproved,
        verified: isApproved,
      })
      .eq("id", vendorId);
  }

  const { error } = result;
  if (error) {
    redirect(`${MANAGE_PATH}?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manage");
  revalidatePath("/vendors");
  revalidatePath("/vendor/dashboard");
  revalidatePath("/");
}

function parseHomepageOrder(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : false;
}

function formatHomepageCarouselSaveError(message: string) {
  if (message.includes("homepage_carousel") || message.includes("homepage_order")) {
    return "Homepage carousel database columns are missing. Run the Supabase SQL migration, then save again.";
  }

  return message;
}

function normalizeManageNextPath(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/manage")) {
    return MANAGE_PATH;
  }
  return value;
}

function withManageQueryParam(path: string, key: "message" | "error", value: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("message");
  params.delete("error");
  params.set(key, value);
  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

function isMissingColumnError(error: { code?: string | null; message?: string | null }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes("column") &&
      (message.includes("does not exist") || message.includes("could not find")))
  );
}

function isMissingTableError(error: { code?: string | null; message?: string | null }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("could not find the table") && message.includes("admin_notes"))
  );
}

function serializeManageError(error: {
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
