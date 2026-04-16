import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  role: "planner" | "vendor" | "admin";
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    return profile as Profile;
  }

  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    full_name: metadata.full_name ?? null,
    email: user.email ?? null,
    phone: metadata.phone ?? null,
    role: (metadata.role ?? "planner") as Profile["role"],
  };
}

export async function requirePlannerProfile(nextPath = "/planner/dashboard") {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  if (profile.role === "vendor") {
    redirect("/vendor/dashboard");
  }

  return profile;
}

export async function requireVendorProfile(nextPath = "/vendor/dashboard") {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  if (profile.role !== "vendor") {
    redirect("/planner/dashboard");
  }

  return profile;
}

export async function requireAdminProfile(nextPath = "/admin/tiktok") {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  if (profile.role !== "admin") {
    if (profile.role === "vendor") {
      redirect("/vendor/dashboard");
    }
    redirect("/planner/dashboard");
  }

  return profile;
}
