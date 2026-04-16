const categoryPlaceholderMap = {
  "Makeup Artist": "/vendors/placeholders/makeup-artist.svg",
  Photographer: "/vendors/placeholders/photographer.svg",
  "Event Planner": "/vendors/placeholders/event-planner.svg",
  Decorator: "/vendors/placeholders/decorator.svg",
  "Asoebi Designer": "/vendors/placeholders/bridal-fashion.svg",
  Caterer: "/vendors/placeholders/catering.svg",
  Catering: "/vendors/placeholders/catering.svg",
  "MC / Host": "/vendors/placeholders/mc-host.svg",
  "MC": "/vendors/placeholders/mc-host.svg",
  Beauty: "/vendors/placeholders/beauty.svg",
  Venue: "/vendors/placeholders/venue.svg",
} as const;

const categoryAliases: Array<{ keywords: string[]; image: string }> = [
  {
    keywords: ["makeup", "beauty", "glam"],
    image: "/vendors/placeholders/makeup-artist.svg",
  },
  {
    keywords: ["photo", "camera", "film", "video"],
    image: "/vendors/placeholders/photographer.svg",
  },
  {
    keywords: ["planner", "planning", "coordination"],
    image: "/vendors/placeholders/event-planner.svg",
  },
  {
    keywords: ["decor", "styling", "floral"],
    image: "/vendors/placeholders/decorator.svg",
  },
  {
    keywords: ["asoebi", "gele", "fashion", "bridal"],
    image: "/vendors/placeholders/bridal-fashion.svg",
  },
  {
    keywords: ["cater", "food"],
    image: "/vendors/placeholders/catering.svg",
  },
  {
    keywords: ["mc", "host", "compere"],
    image: "/vendors/placeholders/mc-host.svg",
  },
  {
    keywords: ["venue", "hall"],
    image: "/vendors/placeholders/venue.svg",
  },
];

export function getVendorPlaceholderImage(category: string) {
  const directMatch =
    categoryPlaceholderMap[category as keyof typeof categoryPlaceholderMap];

  if (directMatch) {
    return directMatch;
  }

  const normalized = category.toLowerCase();
  const aliasMatch = categoryAliases.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );

  return aliasMatch?.image ?? "/vendors/placeholders/beauty.svg";
}
