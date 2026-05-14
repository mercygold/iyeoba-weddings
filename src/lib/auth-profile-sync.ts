import type { User } from "@supabase/supabase-js";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

  const admin = createSupabaseAdminClient();
  const lookupClient = admin ?? supabase;
  const { data: existingVendors, error: existingVendorError } = await lookupClient
    .from("vendors")
    .select(
      "id, user_id, business_name, location, status, profile_status, onboarding_completed, approved, verified, primary_social_link, instagram, website, description, portfolio_image_urls, government_id_url, created_at",
    )
    .eq("user_id", user.id);

  if (existingVendorError) {
    console.warn("[auth:profile-sync] vendor lookup failed", {
      userId: user.id,
      message: existingVendorError.message,
      code: getErrorCode(existingVendorError),
    });
    return;
  }

  const existingVendor = Array.isArray(existingVendors)
    ? chooseBestExistingVendor(existingVendors)
    : null;

  if (existingVendor?.id) {
    return;
  }

  if (admin) {
    const linkedVendor = await findVendorLinkedToEmail(admin, email, user.id);
    if (linkedVendor?.id) {
      console.warn("[auth:profile-sync] matching vendor exists for email; skipping blank draft", {
        userId: user.id,
        email: maskEmail(email),
        vendorId: linkedVendor.id,
        vendorUserId: linkedVendor.user_id ?? null,
      });
      return;
    }
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

async function findVendorLinkedToEmail(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  email: string,
  currentUserId: string,
) {
  const { data: profiles, error: profilesError } = await admin
    .from("users")
    .select("id, email")
    .eq("email", email);

  if (profilesError) {
    console.warn("[auth:profile-sync] email profile lookup failed", {
      userId: currentUserId,
      email: maskEmail(email),
      message: profilesError.message,
      code: getErrorCode(profilesError),
    });
    return null;
  }

  const linkedUserIds = [
    ...new Set(
      (profiles ?? [])
        .map((profile) => profile.id)
        .filter((id): id is string => Boolean(id) && id !== currentUserId),
    ),
  ];

  if (!linkedUserIds.length) {
    return null;
  }

  const { data: vendors, error: vendorsError } = await admin
    .from("vendors")
    .select(
      "id, user_id, business_name, location, status, profile_status, onboarding_completed, approved, verified, primary_social_link, instagram, website, description, portfolio_image_urls, government_id_url, created_at",
    )
    .in("user_id", linkedUserIds);

  if (vendorsError) {
    console.warn("[auth:profile-sync] email-linked vendor lookup failed", {
      userId: currentUserId,
      email: maskEmail(email),
      linkedUserIds,
      message: vendorsError.message,
      code: getErrorCode(vendorsError),
    });
    return null;
  }

  return chooseBestExistingVendor(vendors ?? []);
}

function chooseBestExistingVendor<T extends Record<string, unknown>>(vendors: T[]) {
  if (!vendors.length) {
    return null;
  }

  return [...vendors].sort((a, b) => {
    const scoreDifference = scoreExistingVendor(b) - scoreExistingVendor(a);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }
    return toTimestamp(b.created_at) - toTimestamp(a.created_at);
  })[0] ?? null;
}

function scoreExistingVendor(vendor: Record<string, unknown>) {
  let score = 0;
  const status = normalizeString(vendor.status);
  const profileStatus = normalizeString(vendor.profile_status);

  if (vendor.approved === true || status === "approved") score += 100;
  if (status === "pending_review" || profileStatus === "pending_review") score += 80;
  if (status === "needs_changes" || profileStatus === "needs_changes") score += 60;
  if (vendor.onboarding_completed === true) score += 40;
  if (normalizeString(vendor.business_name)) score += 8;
  if (normalizeString(vendor.primary_social_link ?? vendor.instagram)) score += 6;
  if (normalizeString(vendor.website)) score += 5;
  if (normalizeString(vendor.description)) score += 5;
  if (normalizeString(vendor.government_id_url)) score += 4;
  if (Array.isArray(vendor.portfolio_image_urls) && vendor.portfolio_image_urls.length) {
    score += 10;
  }
  if (normalizeString(vendor.business_name).toLowerCase() === "draft vendor profile") {
    score -= 20;
  }
  if (normalizeString(vendor.location).toLowerCase() === "to be updated") {
    score -= 10;
  }

  return score;
}

function toTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!name || !domain) {
    return value ? "***" : "";
  }
  return `${name.slice(0, 2)}***@${domain}`;
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
