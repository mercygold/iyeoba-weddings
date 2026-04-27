"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/requireAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MANAGE_PATH = "/manage";

export async function updateManageVendorStatusAction(formData: FormData) {
  await requireAdmin("/manage");
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const requested = String(formData.get("status") ?? "").trim();
  const mappedStatus = mapManageStatus(requested);

  if (!vendorId || !mappedStatus) {
    redirect(`${MANAGE_PATH}?message=Invalid%20vendor%20status%20request.`);
  }

  await setVendorStatus(vendorId, mappedStatus);
  redirect(`${MANAGE_PATH}?message=Vendor%20status%20updated.`);
}

export async function approveVendorAction(formData: FormData) {
  await requireAdmin("/manage");
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  if (!vendorId) {
    redirect(`${MANAGE_PATH}?message=Vendor%20record%20was%20not%20found.`);
  }
  await setVendorStatus(vendorId, "approved");
  redirect(`${MANAGE_PATH}?message=Vendor%20approved.`);
}

export async function rejectVendorAction(formData: FormData) {
  await requireAdmin("/manage");
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  if (!vendorId) {
    redirect(`${MANAGE_PATH}?message=Vendor%20record%20was%20not%20found.`);
  }
  await setVendorStatus(vendorId, "rejected");
  redirect(`${MANAGE_PATH}?message=Vendor%20rejected.`);
}

export async function setVendorPendingAction(formData: FormData) {
  await requireAdmin("/manage");
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  if (!vendorId) {
    redirect(`${MANAGE_PATH}?message=Vendor%20record%20was%20not%20found.`);
  }
  await setVendorStatus(vendorId, "pending_review");
  redirect(`${MANAGE_PATH}?message=Vendor%20marked%20pending%20review.`);
}

export async function addManageVendorNoteAction(formData: FormData) {
  const admin = await requireAdmin("/manage");

  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!vendorId || !note) {
    redirect(`${MANAGE_PATH}?message=Add%20a%20valid%20note%20before%20saving.`);
  }

  const supabase = await createSupabaseServerClient();
  const insertResult = await supabase.from("admin_notes").insert({
    vendor_id: vendorId,
    admin_id: admin.userId,
    note,
  });

  if (insertResult.error) {
    redirect(`${MANAGE_PATH}?message=${encodeURIComponent(insertResult.error.message)}`);
  }

  const vendorUpdateResult = await supabase
    .from("vendors")
    .update({
      admin_notes: note,
      last_reviewed_at: new Date().toISOString(),
      reviewed_by: admin.userId,
    })
    .eq("id", vendorId);

  if (vendorUpdateResult.error) {
    redirect(`${MANAGE_PATH}?message=${encodeURIComponent(vendorUpdateResult.error.message)}`);
  }

  revalidatePath("/manage");
  revalidatePath("/vendor/dashboard");
  redirect("/manage?tab=notes&message=Admin%20note%20saved.");
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
  const { error } = await supabase
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

  if (error) {
    redirect(`${MANAGE_PATH}?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manage");
  revalidatePath("/vendors");
  revalidatePath("/vendor/dashboard");
  revalidatePath("/");
}
