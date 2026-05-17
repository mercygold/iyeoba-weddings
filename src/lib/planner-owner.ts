import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function resolvePlannerOwnerIdForSupabase(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  fallbackId: string,
) {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.warn("Planner owner resolution failed", {
      fallbackId,
      message: error.message,
    });
    return fallbackId;
  }

  return data.user?.id ?? fallbackId;
}
