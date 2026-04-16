import { sampleVendors } from "@/lib/sample-vendors";
import { getVendorPlaceholderImage } from "@/lib/vendor-placeholders";
import { normalizeVendorCategory } from "@/lib/vendor-categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const vendorSelect = `
  id,
  user_id,
  slug,
  business_name,
  owner_name,
  category,
  custom_category,
  registered_business,
  country_region,
  nigeria_state,
  phone_code,
  culture,
  culture_specialization,
  location,
  years_experience,
  primary_social_link,
  contact_email,
  instagram,
  website,
  whatsapp,
  price_currency,
  price_amount,
  price_range,
  status,
  profile_status,
  onboarding_completed,
  approved,
  portfolio_image_urls,
  government_id_url,
  cac_certificate_url,
  admin_notes,
  availability_status,
  verified,
  description,
  services_offered,
  value_statement,
  vendor_portfolio(image_url, sort_order)
`;

const legacyVendorSelect = `
  id,
  user_id,
  slug,
  business_name,
  owner_name,
  category,
  country_region,
  nigeria_state,
  phone_code,
  culture,
  culture_specialization,
  location,
  years_experience,
  primary_social_link,
  instagram,
  website,
  whatsapp,
  price_currency,
  price_amount,
  price_range,
  profile_status,
  onboarding_completed,
  approved,
  portfolio_image_urls,
  government_id_url,
  availability_status,
  verified,
  description,
  services_offered,
  value_statement,
  vendor_portfolio(image_url, sort_order)
`;

export type VendorDirectoryItem = {
  id?: string;
  userId?: string | null;
  slug: string;
  businessName: string;
  ownerName?: string | null;
  category: string;
  customCategory?: string | null;
  registeredBusiness?: boolean;
  countryRegion?: string | null;
  nigeriaState?: string | null;
  phoneCode?: string | null;
  cultureSpecialization: string;
  location: string;
  yearsExperience?: string | null;
  primarySocialLink?: string | null;
  contactEmail?: string | null;
  instagram: string;
  website: string;
  whatsapp: string;
  priceCurrency?: string | null;
  priceAmount?: number | null;
  priceRange: string;
  status?: string | null;
  onboardingCompleted?: boolean;
  approved?: boolean;
  portfolioImageUrls?: readonly string[];
  governmentIdUrl?: string | null;
  cacCertificateUrl?: string | null;
  adminNotes?: string | null;
  availabilityStatus: string;
  verified: boolean;
  description: string;
  servicesOffered: readonly string[];
  valueStatement: string;
  portfolio: readonly string[];
  imageUrl: string;
};

type Filters = {
  category?: string;
  culture?: string;
  location?: string;
};

const lifecycleStatuses = new Set([
  "draft",
  "pending_review",
  "approved",
  "needs_changes",
  "suspended",
  "archived",
]);

export async function getVendorDirectory(filters: Filters = {}) {
  const supabase = await createSupabaseServerClient();

  const dbConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (dbConfigured) {
    let request = supabase.from("vendors").select(vendorSelect).eq("status", "approved");

    if (filters.category) {
      request = request.ilike("category", `%${filters.category}%`);
    }
    if (filters.culture) {
      request = request.ilike("culture_specialization", `%${filters.culture}%`);
    }
    if (filters.location) {
      request = request.ilike("location", `%${filters.location}%`);
    }

    let { data, error } = await request.order("created_at", {
      ascending: false,
    });

    if (error && isSchemaDriftError(error)) {
      console.warn("Vendor directory query fell back to legacy select", {
        filters,
        error: serializeSupabaseError(error),
      });

      let legacyRequest = supabase
        .from("vendors")
        .select(legacyVendorSelect)
        .eq("approved", true);

      if (filters.category) {
        legacyRequest = legacyRequest.ilike("category", `%${filters.category}%`);
      }
      if (filters.culture) {
        legacyRequest = legacyRequest.ilike(
          "culture_specialization",
          `%${filters.culture}%`,
        );
      }
      if (filters.location) {
        legacyRequest = legacyRequest.ilike("location", `%${filters.location}%`);
      }

      const fallback = await legacyRequest.order("created_at", {
        ascending: false,
      });
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    if (!error && data?.length) {
      const mapped = data.map((item) => {
        const portfolioImages =
          item.vendor_portfolio
            ?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((entry) => entry.image_url) ?? [];
        const normalizedCategory = normalizeVendorCategory(
          item.category,
          item.custom_category ?? null,
        );
        const rawStatus = item.status ?? null;
        const rawApproved = item.approved ?? false;
        const rawProfileStatus = item.profile_status ?? null;
        const status = normalizeVendorStatus(
          rawStatus,
          rawProfileStatus,
          rawApproved,
        );
        const isApproved = isVendorPubliclyApproved(status, rawApproved);
        return {
        id: item.id,
        userId: item.user_id,
        slug: item.slug,
        businessName: item.business_name,
        ownerName: item.owner_name ?? null,
        category: normalizedCategory.category,
        customCategory: normalizedCategory.subcategory,
        registeredBusiness: item.registered_business ?? false,
        countryRegion: item.country_region ?? null,
        nigeriaState: item.nigeria_state ?? null,
        phoneCode: item.phone_code ?? null,
        cultureSpecialization:
          item.culture ?? item.culture_specialization ?? "Nigerian weddings",
        location: item.location,
        yearsExperience: item.years_experience ?? null,
        primarySocialLink: item.primary_social_link ?? item.instagram ?? null,
        contactEmail: item.contact_email ?? null,
        instagram: item.instagram ?? "",
        website: item.website ?? "",
        whatsapp: item.whatsapp ?? "",
        priceCurrency: item.price_currency ?? null,
        priceAmount:
          typeof item.price_amount === "number"
            ? item.price_amount
            : item.price_amount
              ? Number(item.price_amount)
              : null,
        priceRange: item.price_range ?? "Contact vendor",
        status,
        onboardingCompleted: item.onboarding_completed ?? false,
        approved: isApproved,
        portfolioImageUrls:
          portfolioImages.length ? portfolioImages : item.portfolio_image_urls ?? [],
        governmentIdUrl: item.government_id_url ?? null,
        cacCertificateUrl: item.cac_certificate_url ?? null,
        adminNotes: item.admin_notes ?? null,
        availabilityStatus: item.availability_status ?? "Availability on request",
        verified: item.verified ?? false,
        description: item.description ?? item.value_statement ?? "Vendor profile scaffolded.",
        servicesOffered: item.services_offered ?? [],
        valueStatement: item.value_statement ?? "Vendor profile scaffolded.",
        portfolio: [],
        imageUrl:
          portfolioImages[0] ??
          getVendorPlaceholderImage(normalizedCategory.category ?? "Beauty"),
        };
      }) satisfies VendorDirectoryItem[];

      const publicVendors = mapped.filter(
        (vendor) => vendor.status === "approved" && vendor.approved === true,
      );
      console.log("Homepage/public vendor query", {
        filters,
        totalFetched: mapped.length,
        publicCount: publicVendors.length,
        vendors: mapped.map((vendor) => ({
          id: vendor.id ?? null,
          businessName: vendor.businessName,
          status: vendor.status ?? null,
          approved: vendor.approved ?? false,
        })),
        columns: data[0] ? Object.keys(data[0]) : [],
      });
      return publicVendors;
    }

    if (!error && data) {
      console.log("Homepage/public vendor query", {
        filters,
        totalFetched: 0,
        publicCount: 0,
        statuses: [],
        columns: [],
      });
      return [];
    }

    if (error) {
      console.error("Homepage/public vendor query failed", {
        filters,
        error: serializeSupabaseError(error),
        select: vendorSelect,
        legacySelectTried: true,
      });
    }
  }

  return sampleVendors
    .filter((vendor) => {
      const categoryMatch = filters.category
        ? vendor.category.toLowerCase().includes(filters.category.toLowerCase())
        : true;
      const cultureMatch = filters.culture
        ? vendor.cultureSpecialization
            .toLowerCase()
            .includes(filters.culture.toLowerCase())
        : true;
      const locationMatch = filters.location
        ? vendor.location.toLowerCase().includes(filters.location.toLowerCase())
        : true;

      return categoryMatch && cultureMatch && locationMatch;
    })
    .map((vendor) => {
      const normalizedCategory = normalizeVendorCategory(vendor.category, null);
      return {
      ...vendor,
      id: vendor.slug,
      category: normalizedCategory.category,
      userId: null,
      onboardingCompleted: true,
      approved: vendor.verified,
      status: vendor.verified ? "approved" : "draft",
      portfolioImageUrls: [],
      governmentIdUrl: null,
      countryRegion: null,
      nigeriaState: null,
      phoneCode: null,
      customCategory: normalizedCategory.subcategory,
      registeredBusiness: false,
      primarySocialLink: null,
      contactEmail: null,
      priceCurrency: null,
      priceAmount: null,
      cacCertificateUrl: null,
      adminNotes: null,
      imageUrl: getVendorPlaceholderImage(normalizedCategory.category),
    };
    });
}

export async function getFeaturedVendors() {
  const vendors = await getVendorDirectory();
  return vendors.slice(0, 3);
}

export async function getVendorBySlug(slug: string) {
  const vendors = await getVendorDirectory();
  return vendors.find((vendor) => vendor.slug === slug) ?? null;
}

export async function getVendorsBySlugs(slugs: string[]) {
  if (!slugs.length) {
    return [];
  }

  const vendors = await getVendorDirectory();
  return vendors.filter((vendor) => slugs.includes(vendor.slug));
}

export async function getVendorByUserId(userId: string) {
  const supabase = await createSupabaseServerClient();
  const dbConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!dbConfigured) {
    return null;
  }

  let { data, error } = await supabase
    .from("vendors")
    .select(vendorSelect)
    .eq("user_id", userId)
    .maybeSingle();

  console.log("Vendor dashboard lookup", {
    userId,
    foundVendorId: data?.id ?? null,
    businessName: data?.business_name ?? null,
    status: data?.status ?? null,
    approved: data?.approved ?? false,
    legacyProfileStatus: data?.profile_status ?? null,
    columns: data ? Object.keys(data) : [],
    error: error ? serializeSupabaseError(error) : null,
  });

  if (error && isSchemaDriftError(error)) {
    console.warn("Vendor dashboard query fell back to legacy select", {
      userId,
      select: legacyVendorSelect,
      error: serializeSupabaseError(error),
    });

    const fallback = await supabase
      .from("vendors")
      .select(legacyVendorSelect)
      .eq("user_id", userId)
      .maybeSingle();

    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error || !data) {
    if (error) {
      console.error("Vendor dashboard lookup failed", {
        userId,
        error: serializeSupabaseError(error),
        select: vendorSelect,
        legacySelect: legacyVendorSelect,
        legacySelectTried: true,
      });
    }
    return null;
  }

  const rawStatus = data.status ?? null;
  const rawApproved = data.approved ?? false;
  const rawProfileStatus = data.profile_status ?? null;
  const status = normalizeVendorStatus(rawStatus, rawProfileStatus, rawApproved);
  const isApproved = isVendorPubliclyApproved(status, rawApproved);

  const portfolioImages =
    data.vendor_portfolio
      ?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((entry) => entry.image_url) ?? [];

  return {
    id: data.id,
    userId: data.user_id,
    slug: data.slug,
    businessName: data.business_name,
    ownerName: data.owner_name ?? null,
    category: data.category,
    customCategory: data.custom_category ?? null,
    registeredBusiness: data.registered_business ?? false,
    countryRegion: data.country_region ?? null,
    nigeriaState: data.nigeria_state ?? null,
    phoneCode: data.phone_code ?? null,
    cultureSpecialization:
      data.culture ?? data.culture_specialization ?? "Nigerian weddings",
    location: data.location,
    yearsExperience: data.years_experience ?? null,
    primarySocialLink: data.primary_social_link ?? data.instagram ?? null,
    contactEmail: data.contact_email ?? null,
    instagram: data.instagram ?? "",
    website: data.website ?? "",
    whatsapp: data.whatsapp ?? "",
    priceCurrency: data.price_currency ?? null,
    priceAmount:
      typeof data.price_amount === "number"
        ? data.price_amount
        : data.price_amount
          ? Number(data.price_amount)
          : null,
    priceRange: data.price_range ?? "Contact vendor",
    status,
    onboardingCompleted: data.onboarding_completed ?? false,
    approved: isApproved,
    portfolioImageUrls:
      portfolioImages.length ? portfolioImages : data.portfolio_image_urls ?? [],
    governmentIdUrl: data.government_id_url ?? null,
    cacCertificateUrl: data.cac_certificate_url ?? null,
    adminNotes: data.admin_notes ?? null,
    availabilityStatus: data.availability_status ?? "Availability on request",
    verified: data.verified ?? false,
    description: data.description ?? data.value_statement ?? "Vendor profile scaffolded.",
    servicesOffered: data.services_offered ?? [],
    valueStatement: data.value_statement ?? "Vendor profile scaffolded.",
    portfolio: [],
    imageUrl:
      portfolioImages[0] ?? getVendorPlaceholderImage(data.category ?? "Beauty"),
  } satisfies VendorDirectoryItem;
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

function isVendorPubliclyApproved(
  status: string | null | undefined,
  approved: boolean,
) {
  return status === "approved" && approved === true;
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
