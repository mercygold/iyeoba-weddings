import { sampleVendors } from "@/lib/sample-vendors";
import { getVendorPlaceholderImage } from "@/lib/vendor-placeholders";
import { normalizeVendorCategory } from "@/lib/vendor-categories";
import {
  formatVendorStartingPrice,
  toSupportedVendorCurrency,
} from "@/lib/currency";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const vendorSelect = `
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
  status,
  profile_status,
  onboarding_completed,
  approved,
  homepage_carousel,
  homepage_order,
  approved_at,
  last_reviewed_at,
  updated_at,
  created_at,
  portfolio_image_urls,
  government_id_url,
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
  last_reviewed_at,
  updated_at,
  created_at,
  portfolio_image_urls,
  government_id_url,
  admin_notes,
  availability_status,
  verified,
  created_at,
  description,
  services_offered,
  value_statement,
  vendor_portfolio(image_url, sort_order)
`;

const vendorDashboardSelect = `
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
  status,
  profile_status,
  onboarding_completed,
  approved,
  portfolio_image_urls,
  government_id_url,
  admin_notes,
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
  homepageCarousel?: boolean;
  homepageOrder?: number | null;
  approvedAt?: string | null;
  portfolioImageUrls?: readonly string[];
  governmentIdUrl?: string | null;
  cacCertificateUrl?: string | null;
  adminNotes?: string | null;
  lastReviewedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
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

export async function getVendorDirectory(
  filters: Filters = {},
): Promise<VendorDirectoryItem[]> {
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
        const itemRecord = item as Record<string, any>;
        const portfolioImages =
          item.vendor_portfolio
            ?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((entry) => entry.image_url) ?? [];
        const normalizedCategory = normalizeVendorCategory(
          item.category,
          itemRecord.custom_category ?? null,
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
        const hasVerificationProof = hasVendorVerificationProof({
          governmentIdUrl: item.government_id_url ?? null,
          cacCertificateUrl: itemRecord.cac_certificate_url ?? null,
          registeredBusiness: itemRecord.registered_business ?? false,
          primarySocialLink: item.primary_social_link ?? item.instagram ?? null,
          website: item.website ?? null,
        });
        return {
        id: item.id,
        userId: item.user_id,
        slug: item.slug,
        businessName: item.business_name,
        ownerName: item.owner_name ?? null,
        category: normalizedCategory.category,
        customCategory: normalizedCategory.subcategory,
        registeredBusiness: itemRecord.registered_business ?? false,
        countryRegion: item.country_region ?? null,
        nigeriaState: item.nigeria_state ?? null,
        phoneCode: item.phone_code ?? null,
        cultureSpecialization:
          item.culture ?? item.culture_specialization ?? "Nigerian weddings",
        location: item.location,
        yearsExperience: item.years_experience ?? null,
        primarySocialLink: item.primary_social_link ?? item.instagram ?? null,
        contactEmail: itemRecord.contact_email ?? null,
        instagram: item.instagram ?? "",
        website: item.website ?? "",
        whatsapp: item.whatsapp ?? "",
        priceCurrency:
          toSupportedVendorCurrency(itemRecord.currency_code) ??
          toSupportedVendorCurrency(item.price_currency) ??
          null,
        priceAmount:
          typeof itemRecord.starting_price === "number"
            ? itemRecord.starting_price
            : itemRecord.starting_price
              ? Number(itemRecord.starting_price)
              : typeof item.price_amount === "number"
                ? item.price_amount
                : item.price_amount
                  ? Number(item.price_amount)
                  : null,
        priceRange: formatVendorStartingPrice({
          currencyCode:
            toSupportedVendorCurrency(itemRecord.currency_code) ??
            toSupportedVendorCurrency(item.price_currency),
          startingPrice:
            typeof itemRecord.starting_price === "number"
              ? itemRecord.starting_price
              : itemRecord.starting_price
                ? Number(itemRecord.starting_price)
                : typeof item.price_amount === "number"
                  ? item.price_amount
                  : item.price_amount
                    ? Number(item.price_amount)
                    : null,
          priceLabel:
            typeof itemRecord.price_label === "string" ? itemRecord.price_label : null,
          legacyPriceRange: item.price_range ?? null,
        }),
        status,
        onboardingCompleted: item.onboarding_completed ?? false,
        approved: isApproved,
        homepageCarousel: itemRecord.homepage_carousel === true,
        homepageOrder: toNullableInteger(itemRecord.homepage_order),
        approvedAt: itemRecord.approved_at ?? null,
        portfolioImageUrls:
          portfolioImages.length ? portfolioImages : item.portfolio_image_urls ?? [],
        governmentIdUrl: item.government_id_url ?? null,
        cacCertificateUrl: itemRecord.cac_certificate_url ?? null,
        adminNotes: item.admin_notes ?? null,
        lastReviewedAt: item.last_reviewed_at ?? null,
        updatedAt: item.updated_at ?? null,
        createdAt: itemRecord.created_at ?? null,
        availabilityStatus: item.availability_status ?? "Availability on request",
        verified: item.verified === true || (isApproved && hasVerificationProof),
        description: item.description ?? item.value_statement ?? "Vendor profile scaffolded.",
        servicesOffered: item.services_offered ?? [],
        valueStatement: item.value_statement ?? "Vendor profile scaffolded.",
        portfolio: [],
        imageUrl:
          portfolioImages[0] ??
          getVendorPlaceholderImage(normalizedCategory.category ?? "Beauty"),
        };
      }) satisfies VendorDirectoryItem[];

      const publicVendors = mapped
        .filter((vendor) => vendor.status === "approved" && vendor.approved === true)
        .filter(dedupeVendorById)
        .sort(comparePublicVendorRecency);
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
      homepageCarousel: false,
      homepageOrder: null,
      approvedAt: null,
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
      lastReviewedAt: null,
      updatedAt: null,
      createdAt: null,
      imageUrl: getVendorPlaceholderImage(normalizedCategory.category),
    };
    });
}

export async function getFeaturedVendors(): Promise<VendorDirectoryItem[]> {
  const vendors = await getVendorDirectory();
  const carouselVendors = vendors.filter((vendor) => vendor.homepageCarousel);
  const fallbackVendors = vendors.filter(
    (vendor) => !vendor.homepageCarousel && vendor.verified,
  );

  return [...carouselVendors, ...fallbackVendors].slice(0, 10);
}

export async function getVendorBySlug(
  slug: string,
): Promise<VendorDirectoryItem | null> {
  const vendors = await getVendorDirectory();
  return vendors.find((vendor) => vendor.slug === slug) ?? null;
}

export async function getVendorsBySlugs(
  slugs: string[],
): Promise<VendorDirectoryItem[]> {
  if (!slugs.length) {
    return [];
  }

  const vendors = await getVendorDirectory();
  return vendors.filter((vendor) => slugs.includes(vendor.slug));
}

export async function getVendorByUserId(
  userId: string,
): Promise<VendorDirectoryItem | null> {
  const supabase = await createSupabaseServerClient();
  const dbConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!dbConfigured) {
    return null;
  }

  const initialQuery = await supabase
    .from("vendors")
    .select(vendorDashboardSelect)
    .eq("user_id", userId);
  let data: Record<string, any> | null = Array.isArray(initialQuery.data)
    ? chooseBestVendorDashboardRow(initialQuery.data as Record<string, any>[])
    : null;
  let error: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  } | null = initialQuery.error;

  if (error && isSchemaDriftError(error)) {
    debugLog("Vendor dashboard query fell back to legacy select", {
      userId,
      select: legacyVendorSelect,
      error: serializeSupabaseError(error),
    });

    const fallback = await supabase
      .from("vendors")
      .select(legacyVendorSelect)
      .eq("user_id", userId);

    data = Array.isArray(fallback.data)
      ? chooseBestVendorDashboardRow(fallback.data as Record<string, any>[])
      : null;
    error = fallback.error;
  }

  if (error || !data) {
    if (error) {
      console.error("Vendor dashboard lookup failed", {
        userId,
        error: serializeSupabaseError(error),
        select: vendorDashboardSelect,
        legacySelect: legacyVendorSelect,
        legacySelectTried: Boolean(error && isSchemaDriftError(error)),
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
      ?.sort(
        (
          a: { sort_order?: number | null; image_url: string },
          b: { sort_order?: number | null; image_url: string },
        ) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      )
      .map((entry: { image_url: string }) => entry.image_url) ?? [];

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
    priceCurrency:
      toSupportedVendorCurrency(data.currency_code) ??
      toSupportedVendorCurrency(data.price_currency) ??
      null,
    priceAmount:
      typeof data.starting_price === "number"
        ? data.starting_price
        : data.starting_price
          ? Number(data.starting_price)
          : typeof data.price_amount === "number"
            ? data.price_amount
            : data.price_amount
              ? Number(data.price_amount)
              : null,
    priceRange: formatVendorStartingPrice({
      currencyCode:
        toSupportedVendorCurrency(data.currency_code) ??
        toSupportedVendorCurrency(data.price_currency),
      startingPrice:
        typeof data.starting_price === "number"
          ? data.starting_price
          : data.starting_price
            ? Number(data.starting_price)
            : typeof data.price_amount === "number"
              ? data.price_amount
              : data.price_amount
                ? Number(data.price_amount)
                : null,
      priceLabel: typeof data.price_label === "string" ? data.price_label : null,
      legacyPriceRange: data.price_range ?? null,
    }),
    status,
    onboardingCompleted: data.onboarding_completed ?? false,
    approved: isApproved,
    portfolioImageUrls:
      portfolioImages.length ? portfolioImages : data.portfolio_image_urls ?? [],
    governmentIdUrl: data.government_id_url ?? null,
    cacCertificateUrl: data.cac_certificate_url ?? null,
    adminNotes: data.admin_notes ?? null,
    lastReviewedAt: data.last_reviewed_at ?? null,
    updatedAt: data.updated_at ?? null,
    createdAt: data.created_at ?? null,
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

function chooseBestVendorDashboardRow(rows: Record<string, any>[]) {
  if (!rows.length) {
    return null;
  }

  return [...rows].sort(compareVendorDashboardRows)[0] ?? null;
}

function compareVendorDashboardRows(
  a: Record<string, any>,
  b: Record<string, any>,
) {
  const scoreDifference = scoreVendorDashboardRow(b) - scoreVendorDashboardRow(a);
  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return toTimestamp(b.created_at) - toTimestamp(a.created_at);
}

function scoreVendorDashboardRow(row: Record<string, any>) {
  let score = 0;
  const status = normalizeVendorStatus(
    typeof row.status === "string" ? row.status : null,
    typeof row.profile_status === "string" ? row.profile_status : null,
    row.approved === true,
  );

  if (row.approved === true || status === "approved") score += 100;
  if (status === "pending_review") score += 80;
  if (status === "needs_changes") score += 60;
  if (row.onboarding_completed === true) score += 40;
  if (normalizeDashboardString(row.business_name)) score += 8;
  if (normalizeDashboardString(row.owner_name)) score += 6;
  if (normalizeDashboardString(row.primary_social_link ?? row.instagram)) score += 6;
  if (normalizeDashboardString(row.website)) score += 5;
  if (normalizeDashboardString(row.description ?? row.value_statement)) score += 5;
  if (normalizeDashboardString(row.whatsapp)) score += 4;
  if (normalizeDashboardString(row.government_id_url)) score += 4;
  if (Array.isArray(row.portfolio_image_urls) && row.portfolio_image_urls.length) {
    score += 10;
  }
  if (Array.isArray(row.vendor_portfolio) && row.vendor_portfolio.length) {
    score += 10;
  }
  if (normalizeDashboardString(row.business_name) === "draft vendor profile") {
    score -= 20;
  }
  if (normalizeDashboardString(row.location) === "to be updated") {
    score -= 10;
  }

  return score;
}

function normalizeDashboardString(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

function hasVendorVerificationProof({
  governmentIdUrl,
  cacCertificateUrl,
  registeredBusiness,
  primarySocialLink,
  website,
}: {
  governmentIdUrl?: string | null;
  cacCertificateUrl?: string | null;
  registeredBusiness?: boolean | null;
  primarySocialLink?: string | null;
  website?: string | null;
}) {
  return Boolean(
    governmentIdUrl ||
      cacCertificateUrl ||
      registeredBusiness ||
      primarySocialLink ||
      website,
  );
}

function dedupeVendorById(
  vendor: VendorDirectoryItem,
  index: number,
  vendors: VendorDirectoryItem[],
) {
  const key = vendor.id ?? vendor.slug;
  return vendors.findIndex((item) => (item.id ?? item.slug) === key) === index;
}

function comparePublicVendorRecency(
  a: VendorDirectoryItem,
  b: VendorDirectoryItem,
) {
  const featuredDifference =
    Number(b.homepageCarousel === true) - Number(a.homepageCarousel === true);
  if (featuredDifference !== 0) {
    return featuredDifference;
  }

  if (a.homepageCarousel && b.homepageCarousel) {
    const aOrder = a.homepageOrder ?? Number.POSITIVE_INFINITY;
    const bOrder = b.homepageOrder ?? Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
  }

  return getPublicVendorRecencyTime(b) - getPublicVendorRecencyTime(a);
}

function getPublicVendorRecencyTime(vendor: VendorDirectoryItem) {
  return Math.max(
    toTimestamp(vendor.approvedAt),
    toTimestamp(vendor.lastReviewedAt),
    toTimestamp(vendor.createdAt),
  );
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toNullableInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
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

function debugLog(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(message, details);
  }
}
