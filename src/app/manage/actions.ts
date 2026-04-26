"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MANAGE_PATH = "/manage";

export async function updateManageVendorStatusAction(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(MANAGE_PATH)}`);
  }
  if (profile.role !== "admin") {
    redirect("/?error=Access%20denied");
  }

  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const requested = String(formData.get("status") ?? "").trim();
  const mappedStatus = mapManageStatus(requested);

  if (!vendorId || !mappedStatus) {
    redirect(`${MANAGE_PATH}?message=Invalid%20vendor%20status%20request.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("vendors")
    .update({
      status: mappedStatus,
      profile_status: mappedStatus,
      approved: mappedStatus === "approved",
      verified: mappedStatus === "approved",
      last_reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
    })
    .eq("id", vendorId);

  if (error) {
    redirect(`${MANAGE_PATH}?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manage");
  revalidatePath("/vendors");
  revalidatePath("/vendor/dashboard");
  revalidatePath("/");
  redirect("/manage?message=Vendor%20status%20updated.");
}

export async function addManageVendorNoteAction(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(MANAGE_PATH)}`);
  }
  if (profile.role !== "admin") {
    redirect("/?error=Access%20denied");
  }

  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!vendorId || !note) {
    redirect(`${MANAGE_PATH}?message=Add%20a%20valid%20note%20before%20saving.`);
  }

  const supabase = await createSupabaseServerClient();
  const insertResult = await supabase.from("admin_notes").insert({
    vendor_id: vendorId,
    admin_id: profile.id,
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
      reviewed_by: profile.id,
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
  if (value === "rejected") return "needs_changes";
  return null;
}
