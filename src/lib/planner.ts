import { TOP_LEVEL_VENDOR_CATEGORIES } from "@/lib/vendor-categories";

export const cultures = [
  "Yoruba",
  "Igbo",
  "Hausa",
  "Edo",
  "Efik / Ibibio",
  "Mixed Nigerian cultures",
  "Diaspora Nigerian wedding",
];

export const weddingTypes = [
  "Traditional wedding",
  "White wedding",
  "Traditional + white wedding",
  "Civil + traditional wedding",
  "Destination wedding",
];

export const locations = [
  "Lagos",
  "Abuja",
  "Port Harcourt",
  "United States",
  "New York",
  "Atlanta",
  "London",
  "United Kingdom",
  "Houston",
  "Canada",
  "Toronto",
  "Australia",
  "Sydney",
  "Melbourne",
  "Europe",
  "Hybrid Nigeria + diaspora",
];

export const budgetRanges = [
  "Under NGN 5M",
  "NGN 5M to NGN 10M",
  "NGN 10M to NGN 20M",
  "NGN 20M+",
];

export const budgetCurrencies = ["NGN", "USD", "CAD", "GBP", "EUR", "AUD"] as const;

export type BudgetCurrency = (typeof budgetCurrencies)[number];

export function isBudgetCurrency(value: string): value is BudgetCurrency {
  return budgetCurrencies.includes(value as BudgetCurrency);
}

export function suggestBudgetCurrency(location: string): BudgetCurrency {
  const normalized = location.trim().toLowerCase();
  if (!normalized) {
    return "USD";
  }

  if (
    normalized.includes("nigeria") ||
    normalized.includes("lagos") ||
    normalized.includes("abuja") ||
    normalized.includes("port harcourt")
  ) {
    return "NGN";
  }

  if (
    normalized.includes("united states") ||
    normalized.includes("usa") ||
    normalized.includes("us") ||
    normalized.includes("houston") ||
    normalized.includes("new york") ||
    normalized.includes("atlanta")
  ) {
    return "USD";
  }

  if (normalized.includes("canada") || normalized.includes("toronto")) {
    return "CAD";
  }

  if (
    normalized.includes("united kingdom") ||
    normalized.includes("uk") ||
    normalized.includes("london")
  ) {
    return "GBP";
  }

  if (
    normalized.includes("australia") ||
    normalized.includes("sydney") ||
    normalized.includes("melbourne")
  ) {
    return "AUD";
  }

  return "USD";
}

export function getBudgetRangesForCurrency(currency: BudgetCurrency): string[] {
  if (currency === "NGN") {
    return ["Under NGN 5M", "NGN 5M to NGN 10M", "NGN 10M to NGN 20M", "NGN 20M+"];
  }
  if (currency === "GBP") {
    return ["Under £5,000", "£5,000 to £10,000", "£10,000 to £20,000", "£20,000+"];
  }
  if (currency === "EUR") {
    return ["Under €5,000", "€5,000 to €10,000", "€10,000 to €20,000", "€20,000+"];
  }
  return ["Under $5,000", "$5,000 to $10,000", "$10,000 to $20,000", "$20,000+"];
}

export type PlannerInput = {
  culture: string;
  weddingType: string;
  location: string;
  budgetCurrency: BudgetCurrency;
  guestCount: number;
  budgetRange: string;
};

export function getPlannerInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): PlannerInput {
  return {
    culture: readSingle(searchParams.culture) ?? "Yoruba",
    weddingType:
      readSingle(searchParams.weddingType) ?? "Traditional + white wedding",
    location: readSingle(searchParams.location) ?? "Lagos",
    budgetCurrency: "NGN",
    guestCount: Number(readSingle(searchParams.guestCount) ?? "250"),
    budgetRange: readSingle(searchParams.budgetRange) ?? "NGN 10M to NGN 20M",
  };
}

export function buildPlannerDashboard(
  input: PlannerInput,
  searchParams: Record<string, string | string[] | undefined>,
) {
  const isLargeWedding = input.guestCount >= 250;
  const diasporaWedding =
    input.location.toLowerCase().includes("london") ||
    input.location.toLowerCase().includes("houston") ||
    input.location.toLowerCase().includes("toronto") ||
    input.location.toLowerCase().includes("diaspora");

  const title = `${input.culture} ${input.weddingType}`;
  const summary = diasporaWedding
    ? `Your Planner is structured for a ${input.culture.toLowerCase()} celebration with diaspora logistics in mind. Prioritize a clear event format, guest management, and vendors experienced in cross-location coordination.`
    : `Your Planner is structured for a ${input.culture.toLowerCase()} celebration in ${input.location}. Focus first on the shape of the event, the guest experience, and the vendors that define the wedding atmosphere early.`;

  const checklist = [
    `Confirm the scope of your ${input.weddingType.toLowerCase()} and how each event day should feel.`,
    `Set a working guest count around ${input.guestCount} so venue, food, and coordination decisions stay realistic.`,
    "Shortlist your highest-impact vendors before expanding into nonessential spending.",
    isLargeWedding
      ? "Prioritize planner or coordinator support because guest logistics will compound quickly."
      : "Keep the vendor shortlist tight so decisions stay manageable and fast.",
    diasporaWedding
      ? "Account for travel, time zones, and family coordination across locations."
      : "Align local vendor availability with your likely ceremony timeline.",
  ];

  const timeline = [
    "Now: lock the wedding format, budget posture, and guest count assumptions.",
    "Next: shortlist key vendors and save the strongest matches into your Planner Dashboard.",
    "Then: send focused inquiries instead of broad vendor outreach.",
    isLargeWedding
      ? "After that: refine guest experience, logistics, and event flow."
      : "After that: refine design details, family roles, and optional extras.",
  ];

  const vendorCategories = [
    "Photography & Videography",
    "Beauty & Grooming",
    "Decor & Rentals",
    "Catering & Small Chops",
    "Fashion & Aso-Oke",
    diasporaWedding ? "Logistics & Transportation" : "Music, DJ & MC",
  ].filter((category) => TOP_LEVEL_VENDOR_CATEGORIES.includes(category));

  return {
    title,
    summary,
    checklist,
    timeline,
    vendorCategories,
    savedVendorSlugs: readMany(searchParams.saved),
    inquiryVendorSlugs: readMany(searchParams.inquiry),
  };
}

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readMany(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
