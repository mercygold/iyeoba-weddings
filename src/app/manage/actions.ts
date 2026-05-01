"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/requireAdmin";
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
  const insertResult = await supabase.from("admin_notes").insert({
    vendor_id: vendorId,
    admin_id: admin.userId,
    note,
  });

  if (insertResult.error && !isMissingTableError(insertResult.error)) {
    redirect(withManageQueryParam(nextPath, "message", insertResult.error.message));
  }

  let vendorUpdateResult = await supabase
    .from("vendors")
    .update({
      admin_notes: note,
      last_reviewed_at: new Date().toISOString(),
      reviewed_by: admin.userId,
    })
    .eq("id", vendorId);

  if (vendorUpdateResult.error && isMissingColumnError(vendorUpdateResult.error)) {
    vendorUpdateResult = await supabase
      .from("vendors")
      .update({
        admin_notes: note,
      })
      .eq("id", vendorId);
  }

  if (vendorUpdateResult.error) {
    redirect(withManageQueryParam(nextPath, "message", vendorUpdateResult.error.message));
  }

  revalidatePath("/manage");
  revalidatePath("/vendor/dashboard");
  redirect(withManageQueryParam(nextPath, "message", "Admin note saved."));
}

function mapManageStatus(value: string) {
  if (value === "approved") return "approved";
  if (value === "pending_review") return "pending_review";
  if (value === "rejected") return "rejected";
  return null;
}

async function setVendorStatus(vendorId: string, status: "pending_review" | "approved" | "rejected") {
  const admin = await requireAdmin(MANAGE_PATH);
  const supabase = await createSupabaseServerClient();
  let result = await supabase
    .from("vendors")
    .update({
      status,
      profile_status: status,
      approved: status === "approved",
      verified: status === "approved",
      last_reviewed_at: new Date().toISOString(),
      reviewed_by: admin.userId,
    })
    .eq("id", vendorId);

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from("vendors")
      .update({
        status,
        profile_status: status,
        approved: status === "approved",
        verified: status === "approved",
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
