import { TOP_LEVEL_VENDOR_CATEGORIES } from "@/lib/vendor-categories";

export const DISCOVERY_LOCATION_OPTIONS = [
  "Nigeria",
  "Lagos",
  "Abuja",
  "Port Harcourt",
  "Ibadan",
  "Benin",
  "Enugu",
  "UK",
  "Europe",
  "US",
  "Canada",
  "Other",
] as const;

export const DISCOVERY_CULTURE_OPTIONS = [
  "Yoruba weddings",
  "Igbo weddings",
  "Hausa weddings",
  "Edo weddings",
  "Efik / Ibibio weddings",
  "Other cultures",
] as const;

export function getSharedCategoryOptions(selected?: string) {
  return toSelectOptions(TOP_LEVEL_VENDOR_CATEGORIES, selected);
}

export function getSharedLocationOptions(selected?: string) {
  return toSelectOptions(DISCOVERY_LOCATION_OPTIONS, selected);
}

export function getSharedCultureOptions(selected?: string) {
  return toSelectOptions(DISCOVERY_CULTURE_OPTIONS, selected);
}

function toSelectOptions(values: readonly string[], selected?: string) {
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (selected && !normalized.some((value) => value.toLowerCase() === selected.toLowerCase())) {
    normalized.unshift(selected);
  }

  return normalized.map((value) => ({ value, label: value }));
}
