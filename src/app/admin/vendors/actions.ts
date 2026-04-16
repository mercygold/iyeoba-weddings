"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function updateVendorReviewAction(formData: FormData) {
  const adminProfile = await requireAdminProfile("/admin/vendors");
  const admin = createSupabaseAdminClient();

  if (!admin) {
    redirect(
      "/admin/vendors?message=Configure%20Supabase%20service-role%20access%20before%20reviewing%20vendor%20submissions.",
    );
  }

  const vendorId = String(formData.get("vendorId") ?? "");
  const status = String(formData.get("status") ?? "pending_review");
  const adminNotes = String(formData.get("adminNotes") ?? "").trim();
  const allowedStatuses = new Set([
    "draft",
    "pending_review",
    "approved",
    "needs_changes",
    "suspended",
    "archived",
  ]);

  if (!vendorId) {
    redirect("/admin/vendors?message=Vendor%20record%20was%20not%20found.");
  }

  if (!allowedStatuses.has(status)) {
    redirect("/admin/vendors?message=Invalid%20vendor%20status%20selected.");
  }

  const { data: existingVendor, error: existingVendorError } = await admin
    .from("vendors")
    .select("id, business_name, status, approved, profile_status, verified")
    .eq("id", vendorId)
    .single();

  if (existingVendorError || !existingVendor) {
    console.error("Admin vendor review lookup failed", {
      table: "vendors",
      client: "service_role",
      authUserId: adminProfile.id,
      vendorId,
      error: serializeSupabaseError(existingVendorError ?? {}),
    });
    redirect(
      "/admin/vendors?message=We%20could%20not%20load%20this%20vendor%20for%20review.",
    );
  }

  const payload = {
    status,
    profile_status: status,
    admin_notes: adminNotes || null,
    approved: status === "approved",
  };

  console.log("Admin vendor review write attempt", {
    table: "vendors",
    client: "service_role",
    authUserId: adminProfile.id,
    vendorId,
    businessName: existingVendor.business_name ?? null,
    oldStatus: existingVendor.status ?? null,
    oldApproved: existingVendor.approved ?? null,
    oldProfileStatus: existingVendor.profile_status ?? null,
    newStatus: status,
    payload,
  });

  const { data: updatedVendor, error } = await admin
    .from("vendors")
    .update(payload)
    .eq("id", vendorId)
    .select("id, business_name, status, approved, profile_status, admin_notes")
    .single();

  if (error) {
    console.error("Admin vendor review update failed", {
      table: "vendors",
      client: "service_role",
      vendorId,
      businessName: existingVendor.business_name ?? null,
      oldStatus: existingVendor.status ?? null,
      oldApproved: existingVendor.approved ?? null,
      oldProfileStatus: existingVendor.profile_status ?? null,
      newStatus: status,
      adminId: adminProfile.id,
      payload,
      error: serializeSupabaseError(error),
    });
    redirect(
      "/admin/vendors?message=We%20could%20not%20update%20this%20vendor%20right%20now.",
    );
  }

  console.log("Admin vendor review update persisted", {
    table: "vendors",
    client: "service_role",
    authUserId: adminProfile.id,
    vendorId,
    businessName: updatedVendor?.business_name ?? existingVendor.business_name ?? null,
    oldStatus: existingVendor.status ?? null,
    newStatus: updatedVendor?.status ?? null,
    approved: updatedVendor?.approved ?? null,
    profileStatus: updatedVendor?.profile_status ?? null,
    updatedRowId: updatedVendor?.id ?? null,
  });

  revalidatePath("/admin/vendors");
  revalidatePath("/vendors");
  revalidatePath("/");
  revalidatePath("/vendor/dashboard");
  redirect("/admin/vendors?message=Vendor%20review%20status%20updated.");
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
