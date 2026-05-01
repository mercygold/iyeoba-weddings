export type VendorCategoryGroup = {
  category: string;
  description: string;
  subcategories: string[];
};

export const VENDOR_CATEGORY_GROUPS: VendorCategoryGroup[] = [
  {
    category: "Beauty & Grooming",
    description: "Makeup, hair, skin, grooming, and beauty services.",
    subcategories: [],
  },
  {
    category: "Event Planning",
    description: "Planning, coordination, and event management support.",
    subcategories: [],
  },
  {
    category: "Photography & Videography",
    description: "Photo and film teams capturing wedding moments.",
    subcategories: [],
  },
  {
    category: "Decor & Rentals",
    description: "Venue styling, décor design, props, rentals, and setup.",
    subcategories: [],
  },
  {
    category: "Fashion & Aso-Oke",
    description: "Outfits, fabrics, aso-oke, and wedding style.",
    subcategories: [],
  },
  {
    category: "Cakes & Desserts",
    description: "Wedding cakes, dessert tables, and sweet treats.",
    subcategories: [],
  },
  {
    category: "Catering & Small Chops",
    description: "Meals, small chops, drinks, and catering service.",
    subcategories: [],
  },
  {
    category: "Music, DJ & MC",
    description: "DJ, MC, live music, and cultural hosting services.",
    subcategories: [],
  },
  {
    category: "Traditional Wedding Services",
    description: "Cultural wedding support, traditional ceremony services, and family-facing roles.",
    subcategories: [],
  },
  {
    category: "Venues & Hospitality",
    description: "Venues, accommodation, and guest hospitality support.",
    subcategories: [],
  },
  {
    category: "Printing & Invitations",
    description: "Wedding stationery and event branding assets.",
    subcategories: [],
  },
  {
    category: "Logistics & Transportation",
    description: "Transport, movement coordination, and logistics.",
    subcategories: [],
  },
  {
    category: "Jewelry & Accessories",
    description: "Wedding jewelry, accessories, and finishing touches.",
    subcategories: [],
  },
  {
    category: "Souvenirs & Gifts",
    description: "Wedding favors, guest gifting, and keepsakes.",
    subcategories: [],
  },
  {
    category: "Florals & Bouquets",
    description: "Bouquets, floral installations, and fresh flower styling.",
    subcategories: [],
  },
  {
    category: "Other",
    description: "Additional wedding services not listed above.",
    subcategories: [],
  },
];

const legacyCategoryToStructured: Record<string, { category: string; subcategory?: string }> = {
  "makeup artist": { category: "Beauty & Grooming", subcategory: "Makeup" },
  beauty: { category: "Beauty & Grooming", subcategory: "Skincare" },
  photographer: { category: "Photography & Videography", subcategory: "Photographer" },
  videographer: { category: "Photography & Videography", subcategory: "Videographer" },
  "photography & video": { category: "Photography & Videography" },
  "event planner": { category: "Event Planning" },
  "event planning": { category: "Event Planning" },
  decorator: { category: "Decor & Rentals", subcategory: "Decorators" },
  "decor & floral": { category: "Decor & Rentals" },
  "rentals & setup": { category: "Decor & Rentals" },
  caterer: { category: "Catering & Small Chops", subcategory: "Meals" },
  "catering & desserts": { category: "Catering & Small Chops" },
  "asoebi designer": { category: "Fashion & Aso-Oke", subcategory: "Aso-Oke" },
  "fashion & attire": { category: "Fashion & Aso-Oke" },
  venue: { category: "Venues & Hospitality", subcategory: "Guest accommodation" },
  hospitality: { category: "Venues & Hospitality" },
  "mc / host": { category: "Music, DJ & MC", subcategory: "MC" },
  entertainment: { category: "Music, DJ & MC" },
  mc: { category: "Music, DJ & MC", subcategory: "MC" },
  dj: { category: "Music, DJ & MC", subcategory: "DJ" },
  florist: { category: "Florals & Bouquets", subcategory: "Florists" },
  "decor & rentals": { category: "Decor & Rentals" },
  "printing & branding": { category: "Printing & Invitations" },
  "logistics & transport": { category: "Logistics & Transportation" },
  souvenirs: { category: "Souvenirs & Gifts" },
  others: { category: "Other" },
  planner: { category: "Event Planning" },
};

export const TOP_LEVEL_VENDOR_CATEGORIES = VENDOR_CATEGORY_GROUPS.map(
  (entry) => entry.category,
);

export function getSubcategoriesForCategory(category: string) {
  const match = VENDOR_CATEGORY_GROUPS.find((entry) => entry.category === category);
  return match?.subcategories ?? [];
}

export function getAllSubcategoryOptions() {
  return VENDOR_CATEGORY_GROUPS.flatMap((entry) =>
    entry.subcategories.map((subcategory) => ({
      category: entry.category,
      value: subcategory,
      label: `${entry.category} — ${subcategory}`,
    })),
  );
}

export function normalizeVendorCategory(
  rawCategory: string | null | undefined,
  rawCustomCategory: string | null | undefined,
) {
  const category = (rawCategory ?? "").trim();
  const customCategory = (rawCustomCategory ?? "").trim();
  const normalizedRaw = category.toLowerCase();

  if (TOP_LEVEL_VENDOR_CATEGORIES.includes(category)) {
    return {
      category,
      subcategory: category === "Other" ? customCategory || null : customCategory || null,
    };
  }

  const legacyMatch = legacyCategoryToStructured[normalizedRaw];
  if (legacyMatch) {
    return {
      category: legacyMatch.category,
      subcategory: customCategory || legacyMatch.subcategory || null,
    };
  }

  if (!category && !customCategory) {
    return {
      category: "Other",
      subcategory: null,
    };
  }

  return {
    category: "Other",
    subcategory: customCategory || category || null,
  };
}
