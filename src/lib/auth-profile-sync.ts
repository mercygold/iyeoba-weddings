import type { User } from "@supabase/supabase-js";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthRole = "planner" | "vendor" | "admin";

type SyncClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export function normalizeAuthRole(value: unknown): AuthRole {
  return value === "vendor" || value === "admin" ? value : "planner";
}

export async function getAuthRoleRedirectPath(
  supabase: SyncClient,
): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.warn("[auth:redirect] session user lookup failed", {
      message: userError?.message ?? "No user in session.",
    });
    return "/dashboard";
  }

  await syncAuthUserProfileAndVendorDraft(supabase, user);

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.warn("[auth:redirect] profile role lookup failed", {
      userId: user.id,
      message: profileError.message,
      code: profileError.code,
    });
  }

  return getRedirectPathForRole(
    normalizeAuthRole(profile?.role ?? user.user_metadata?.role),
  );
}

export function getRedirectPathForRole(role: AuthRole) {
  if (role === "vendor") {
    return "/vendor/dashboard";
  }

  if (role === "admin") {
    return "/manage";
  }

  return "/planner/dashboard";
}

export async function syncAuthUserProfileAndVendorDraft(
  supabase: SyncClient,
  user: User,
) {
  const metadata = user.user_metadata ?? {};
  const role = normalizeAuthRole(metadata.role);
  const email = normalizeEmail(user.email ?? metadata.email);

  if (!email) {
    return;
  }

  const profilePayload = {
    id: user.id,
    email,
    role,
    full_name: normalizeString(metadata.full_name) || null,
    phone: normalizeString(metadata.phone_number ?? metadata.phone) || null,
    country: normalizeString(metadata.country) || null,
    country_code: normalizeString(metadata.country_code) || null,
    phone_country_code: normalizeString(metadata.phone_country_code) || null,
    phone_number: normalizeString(metadata.phone_number) || null,
    full_phone_number: normalizeString(metadata.full_phone_number) || null,
  };

  const { error: profileError } = await supabase
    .from("users")
    .upsert(profilePayload, { onConflict: "id" });

  if (profileError) {
    console.warn("[auth:profile-sync] public.users upsert failed", {
      userId: user.id,
      role,
      message: profileError.message,
      code: getErrorCode(profileError),
    });
  }

  if (role !== "vendor") {
    return;
  }

  const { data: existingVendor, error: existingVendorError } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingVendorError) {
    console.warn("[auth:profile-sync] vendor lookup failed", {
      userId: user.id,
      message: existingVendorError.message,
      code: getErrorCode(existingVendorError),
    });
    return;
  }

  if (existingVendor?.id) {
    return;
  }

  const businessName =
    normalizeString(metadata.full_name) || email || "Draft vendor profile";
  const slug = await resolveVendorSlug(supabase, businessName, user.id);
  const { error: vendorError } = await supabase.from("vendors").insert({
    user_id: user.id,
    business_name: businessName,
    slug,
    category: "Vendor",
    location: "To be updated",
    culture: "Yoruba",
    culture_specialization: "Yoruba",
    description: "Vendor profile created during auth recovery.",
    approved: false,
    verified: false,
    status: "draft",
    profile_status: "draft",
    onboarding_completed: false,
    availability_status: "Draft profile",
  });

  if (vendorError && !isDuplicateError(vendorError)) {
    console.warn("[auth:profile-sync] vendor draft insert failed", {
      userId: user.id,
      slug,
      message: vendorError.message,
      code: getErrorCode(vendorError),
    });
  }
}

async function resolveVendorSlug(
  supabase: SyncClient,
  value: string,
  authUserId: string,
) {
  const baseSlug = buildVendorSlug(value);
  const candidates = [
    baseSlug,
    `${baseSlug.slice(0, 39)}-${authUserId.slice(0, 8)}`,
    `vendor-${authUserId.slice(0, 8)}`,
  ];

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from("vendors")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!error && !data) {
      return candidate;
    }
  }

  return `vendor-${authUserId.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
}

function buildVendorSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "vendor";
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isDuplicateError(error: { code?: string | null; message?: string }) {
  return (
    error.code === "23505" ||
    (error.message ?? "").toLowerCase().includes("duplicate key")
  );
}

function getErrorCode(error: { code?: string | null } | Error) {
  return "code" in error ? error.code : undefined;
}
