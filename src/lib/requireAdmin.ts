import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminContext = {
  userId: string;
  email: string | null;
  role: "admin";
};

export async function requireAdmin(nextPath = "/manage"): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;

  if (authError || !user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/?error=Access%20denied");
  }

  return {
    userId: profile.id,
    email: profile.email ?? null,
    role: "admin",
  };
}
