import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const adminVendorSelect = `
  id,
  user_id,
  business_name,
  owner_name,
  category,
  custom_category,
  registered_business,
  country_region,
  nigeria_state,
  phone_code,
  location,
  culture_specialization,
  years_experience,
  primary_social_link,
  website,
  description,
  services_offered,
  price_currency,
  price_amount,
  price_range,
  status,
  profile_status,
  onboarding_completed,
  approved,
  verified,
  government_id_url,
  cac_certificate_url,
  admin_notes,
  created_at,
  users(email, phone),
  vendor_portfolio(image_url, sort_order)
`;

const legacyAdminVendorSelect = `
  id,
  user_id,
  business_name,
  owner_name,
  category,
  country_region,
  nigeria_state,
  phone_code,
  location,
  culture_specialization,
  years_experience,
  primary_social_link,
  website,
  description,
  services_offered,
  price_currency,
  price_amount,
  price_range,
  profile_status,
  onboarding_completed,
  approved,
  verified,
  government_id_url,
  created_at,
  users(email, phone),
  vendor_portfolio(image_url, sort_order)
`;

export type AdminVendorSubmission = {
  id: string;
  userId: string | null;
  businessName: string;
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  category: string;
  customCategory: string | null;
  registeredBusiness: boolean;
  countryRegion: string | null;
  nigeriaState: string | null;
  phoneCode: string | null;
  location: string;
  cultureSpecialization: string | null;
  yearsExperience: string | null;
  primarySocialLink: string | null;
  website: string | null;
  description: string | null;
  servicesOffered: string[];
  priceCurrency: string | null;
  priceAmount: number | null;
  priceRange: string | null;
  status: string | null;
  adminNotes: string | null;
  onboardingCompleted: boolean;
  approved: boolean;
  verified: boolean;
  governmentIdPath: string | null;
  governmentIdSignedUrl: string | null;
  cacCertificatePath: string | null;
  cacCertificateSignedUrl: string | null;
  portfolioImages: string[];
  createdAt: string;
};

const lifecycleStatuses = new Set([
  "draft",
  "pending_review",
  "approved",
  "needs_changes",
  "suspended",
  "archived",
]);

export async function getAdminVendorSubmissions() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return [];
  }

  let { data, error } = await admin
    .from("vendors")
    .select(adminVendorSelect)
    .order("created_at", { ascending: false });

  if (error && isSchemaDriftError(error)) {
    console.warn("Admin vendor review query fell back to legacy select", {
      error: serializeSupabaseError(error),
    });
    const fallback = await admin
      .from("vendors")
      .select(legacyAdminVendorSelect)
      .order("created_at", { ascending: false });
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error || !data) {
    if (error) {
      console.error("Admin vendor review query failed", {
        error: serializeSupabaseError(error),
        select: adminVendorSelect,
        legacySelectTried: true,
      });
    }
    return [];
  }

  console.log("Admin vendor review query result", {
    count: data.length,
    pendingReview: data.filter(
      (item) =>
        normalizeVendorStatus(item.status, item.profile_status, item.approved ?? false) ===
        "pending_review",
    ).length,
    vendors: data.map((item) => ({
      id: item.id,
      businessName: item.business_name,
      status: item.status ?? null,
      approved: item.approved ?? false,
      profileStatus: item.profile_status ?? null,
      normalizedStatus: normalizeVendorStatus(
        item.status,
        item.profile_status,
        item.approved ?? false,
      ),
    })),
    columns: data[0] ? Object.keys(data[0]) : [],
  });

  const results = await Promise.all(
    data.map(async (item) => {
      const governmentIdPath = item.government_id_url ?? null;
      let governmentIdSignedUrl: string | null = null;
      const cacCertificatePath = item.cac_certificate_url ?? null;
      let cacCertificateSignedUrl: string | null = null;

      if (governmentIdPath) {
        const { data: signed } = await admin.storage
          .from("vendor-documents")
          .createSignedUrl(governmentIdPath, 60 * 60);
        governmentIdSignedUrl = signed?.signedUrl ?? null;
      }

      if (cacCertificatePath) {
        const { data: signed } = await admin.storage
          .from("vendor-documents")
          .createSignedUrl(cacCertificatePath, 60 * 60);
        cacCertificateSignedUrl = signed?.signedUrl ?? null;
      }

      const portfolioImages =
        item.vendor_portfolio
          ?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((entry) => entry.image_url) ?? [];
      const normalizedStatus = normalizeVendorStatus(
        item.status,
        item.profile_status,
        item.approved ?? false,
      );
      const isApproved = normalizedStatus === "approved";

      const relatedUser = Array.isArray(item.users) ? item.users[0] : item.users;

      return {
        id: item.id,
        userId: item.user_id,
        businessName: item.business_name,
        ownerName: item.owner_name ?? null,
        email: relatedUser?.email ?? null,
        phone: relatedUser?.phone ?? null,
        category: item.category,
        customCategory: item.custom_category ?? null,
        registeredBusiness: item.registered_business ?? false,
        countryRegion: item.country_region ?? null,
        nigeriaState: item.nigeria_state ?? null,
        phoneCode: item.phone_code ?? null,
        location: item.location,
        cultureSpecialization: item.culture_specialization ?? null,
        yearsExperience: item.years_experience ?? null,
        primarySocialLink: item.primary_social_link ?? null,
        website: item.website ?? null,
        description: item.description ?? null,
        servicesOffered: item.services_offered ?? [],
        priceCurrency: item.price_currency ?? null,
        priceAmount:
          typeof item.price_amount === "number"
            ? item.price_amount
            : item.price_amount
              ? Number(item.price_amount)
              : null,
        priceRange: item.price_range ?? null,
        status: normalizedStatus,
        adminNotes: item.admin_notes ?? null,
        onboardingCompleted: item.onboarding_completed ?? false,
        approved: isApproved,
        verified: item.verified ?? false,
        governmentIdPath,
        governmentIdSignedUrl,
        cacCertificatePath,
        cacCertificateSignedUrl,
        portfolioImages,
        createdAt: item.created_at,
      } satisfies AdminVendorSubmission;
    }),
  );

  return results;
}

function isSchemaDriftError(error: { message?: string | null }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("column") &&
    (message.includes("does not exist") || message.includes("could not find"))
  );
}

function normalizeVendorStatus(
  status: string | null | undefined,
  profileStatus: string | null | undefined,
  approved: boolean,
) {
  if (status && lifecycleStatuses.has(status)) {
    return status;
  }

  if (profileStatus && lifecycleStatuses.has(profileStatus)) {
    if (approved && profileStatus === "draft") {
      return "approved";
    }
    return profileStatus;
  }

  if (approved) {
    return "approved";
  }

  return "draft";
}

function serializeSupabaseError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}
