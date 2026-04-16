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
  "London",
  "Houston",
  "Toronto",
  "Hybrid Nigeria + diaspora",
];

export const budgetRanges = [
  "Under NGN 5M",
  "NGN 5M to NGN 10M",
  "NGN 10M to NGN 20M",
  "NGN 20M+",
];

export type PlannerInput = {
  culture: string;
  weddingType: string;
  location: string;
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
    "Photography & Video",
    "Beauty & Grooming",
    "Decor & Floral",
    "Catering & Desserts",
    "Fashion & Attire",
    diasporaWedding ? "Logistics & Transport" : "Entertainment",
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
