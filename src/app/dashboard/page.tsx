import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardRedirectPage() {
  const profile = await getCurrentProfile();

  if (profile?.role === "vendor") {
    redirect("/vendor/dashboard");
  }

  if (profile?.role === "planner" || profile?.role === "admin") {
    redirect("/planner/dashboard");
  }

  redirect("/auth/sign-in");
}
