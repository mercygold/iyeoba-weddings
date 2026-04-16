export type VendorCategoryGroup = {
  category: string;
  description: string;
  subcategories: string[];
};

export const VENDOR_CATEGORY_GROUPS: VendorCategoryGroup[] = [
  {
    category: "Entertainment",
    description: "DJ, MC, live music, and cultural hosting services.",
    subcategories: ["DJ", "MC", "Live Band", "Alaga"],
  },
  {
    category: "Photography & Video",
    description: "Photo and film teams capturing wedding moments.",
    subcategories: ["Photographer", "Videographer"],
  },
  {
    category: "Beauty & Grooming",
    description: "Makeup, hair, skin, and grooming specialists.",
    subcategories: ["Makeup", "Hair", "Nails", "Skincare"],
  },
  {
    category: "Fashion & Attire",
    description: "Outfits, fabrics, and accessories for wedding style.",
    subcategories: ["Aso-Oke", "Wedding Gowns", "Accessories"],
  },
  {
    category: "Catering & Desserts",
    description: "Meals, small chops, and dessert experiences.",
    subcategories: ["Meals", "Small Chops", "Cakes"],
  },
  {
    category: "Decor & Floral",
    description: "Venue styling, décor design, and floral details.",
    subcategories: ["Decorators", "Florists"],
  },
  {
    category: "Rentals & Setup",
    description: "Event rentals and setup logistics.",
    subcategories: ["Chairs", "Tables", "Props"],
  },
  {
    category: "Souvenirs",
    description: "Wedding favors and guest gifting.",
    subcategories: ["Wedding Favors"],
  },
  {
    category: "Drinks & Bar",
    description: "Bar service, drink supply, and mixology.",
    subcategories: ["Mixologists", "Drinks", "Ice"],
  },
  {
    category: "Printing & Branding",
    description: "Wedding stationery and event branding assets.",
    subcategories: ["Invites", "Programs", "Banners"],
  },
  {
    category: "Logistics & Transport",
    description: "Transport, movement coordination, and logistics.",
    subcategories: ["Cars", "Movement", "Vendor logistics"],
  },
  {
    category: "Hospitality",
    description: "Guest stay and accommodation support.",
    subcategories: ["Shortlets", "Guest accommodation"],
  },
  {
    category: "Others",
    description: "Additional wedding services not listed above.",
    subcategories: [],
  },
];

const legacyCategoryToStructured: Record<string, { category: string; subcategory?: string }> = {
  "makeup artist": { category: "Beauty & Grooming", subcategory: "Makeup" },
  beauty: { category: "Beauty & Grooming", subcategory: "Skincare" },
  photographer: { category: "Photography & Video", subcategory: "Photographer" },
  videographer: { category: "Photography & Video", subcategory: "Videographer" },
  "event planner": { category: "Others", subcategory: "Event Planner" },
  decorator: { category: "Decor & Floral", subcategory: "Decorators" },
  caterer: { category: "Catering & Desserts", subcategory: "Meals" },
  "asoebi designer": { category: "Fashion & Attire", subcategory: "Aso-Oke" },
  venue: { category: "Hospitality", subcategory: "Guest accommodation" },
  "mc / host": { category: "Entertainment", subcategory: "MC" },
  mc: { category: "Entertainment", subcategory: "MC" },
  dj: { category: "Entertainment", subcategory: "DJ" },
  florist: { category: "Decor & Floral", subcategory: "Florists" },
  planner: { category: "Others", subcategory: "Event Planner" },
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
      subcategory: category === "Others" ? customCategory || null : customCategory || null,
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
      category: "Others",
      subcategory: null,
    };
  }

  return {
    category: "Others",
    subcategory: customCategory || category || null,
  };
}
