type SupabaseConfigStatus = {
  isValid: boolean;
  publicUrl: string | null;
  anonKey: string | null;
  serviceRoleKey: string | null;
  authMessage: string | null;
  adminMessage: string | null;
};

function isPlaceholder(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized === "your_url" ||
    normalized === "your_key" ||
    normalized === "your_anon_key" ||
    normalized === "replace_me" ||
    normalized === "null"
  );
}

function isLikelyUrl(value: string | undefined) {
  if (!value || isPlaceholder(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

  const hasValidUrl = isLikelyUrl(publicUrl ?? undefined);
  const hasValidAnonKey = Boolean(anonKey && !isPlaceholder(anonKey));
  const hasValidServiceRole = Boolean(
    serviceRoleKey && !isPlaceholder(serviceRoleKey),
  );

  const authMessage =
    hasValidUrl && hasValidAnonKey
      ? null
      : "Supabase auth is not configured correctly. Add valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY values in .env.local.";

  const adminMessage =
    authMessage || hasValidServiceRole
      ? authMessage
        ? "Supabase is partially configured. Auth needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, and server-side writes also need SUPABASE_SERVICE_ROLE_KEY."
        : null
      : "Supabase server-side writes are not configured. Add SUPABASE_SERVICE_ROLE_KEY in .env.local.";

  return {
    isValid: hasValidUrl && hasValidAnonKey,
    publicUrl,
    anonKey,
    serviceRoleKey,
    authMessage,
    adminMessage,
  };
}
