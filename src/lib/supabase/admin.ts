import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

export function createSupabaseAdminClient() {
  const { publicUrl, serviceRoleKey, isValid } = getSupabaseConfigStatus();

  if (!isValid || !publicUrl || !serviceRoleKey) {
    return null;
  }

  try {
    return createClient(publicUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}
