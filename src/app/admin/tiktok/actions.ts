"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function addTikTokVideoAction(formData: FormData) {
  await requireAdminProfile("/admin/tiktok");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect(
      "/admin/tiktok?message=Configure Supabase before using admin video actions.",
    );
  }

  const supabase = await createSupabaseServerClient();

  await supabase.from("tiktok_videos").upsert({
    post_id: String(formData.get("postId") ?? ""),
    share_url: String(formData.get("shareUrl") ?? ""),
    title: String(formData.get("title") ?? "") || null,
    thumbnail_url: String(formData.get("thumbnailUrl") ?? "") || null,
    caption: String(formData.get("caption") ?? ""),
    category: String(formData.get("category") ?? ""),
    culture: "Yoruba",
    vendor_slug: String(formData.get("vendorSlug") ?? "") || null,
    views: 0,
    likes: 0,
    engagement_badge: "Featured on TikTok",
    featured_home: formData.get("featuredHome") === "on",
    featured_landing: formData.get("featuredLanding") === "on",
    featured_profile: Boolean(String(formData.get("vendorSlug") ?? "")),
    active: true,
  });

  revalidatePath("/admin/tiktok");
  redirect("/admin/tiktok?message=TikTok video saved.");
}

export async function removeTikTokVideoAction(formData: FormData) {
  await requireAdminProfile("/admin/tiktok");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect(
      "/admin/tiktok?message=Configure Supabase before using admin video actions.",
    );
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("tiktok_videos")
    .delete()
    .eq("post_id", String(formData.get("postId") ?? ""));

  revalidatePath("/admin/tiktok");
  redirect("/admin/tiktok?message=TikTok video removed.");
}
