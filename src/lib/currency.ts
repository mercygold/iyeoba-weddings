export const supportedVendorCurrencies = [
  "NGN",
  "USD",
  "GBP",
  "CAD",
  "EUR",
  "AUD",
] as const;

export type SupportedVendorCurrency = (typeof supportedVendorCurrencies)[number];

export function toSupportedVendorCurrency(
  value: string | null | undefined,
): SupportedVendorCurrency | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return supportedVendorCurrencies.includes(normalized as SupportedVendorCurrency)
    ? (normalized as SupportedVendorCurrency)
    : null;
}

export function formatVendorStartingPrice({
  currencyCode,
  startingPrice,
  priceLabel,
  legacyPriceRange,
}: {
  currencyCode: SupportedVendorCurrency | null;
  startingPrice: number | null;
  priceLabel?: string | null;
  legacyPriceRange?: string | null;
}) {
  const normalizedLabel = (priceLabel ?? "").trim();
  if (normalizedLabel) {
    return normalizedLabel;
  }

  if (currencyCode && Number.isFinite(startingPrice) && (startingPrice ?? 0) > 0) {
    const formattedAmount = new Intl.NumberFormat("en-US").format(startingPrice as number);
    if (currencyCode === "USD") {
      return `$${formattedAmount}+`;
    }
    if (currencyCode === "GBP") {
      return `£${formattedAmount}+`;
    }
    if (currencyCode === "EUR") {
      return `€${formattedAmount}+`;
    }
    if (currencyCode === "NGN") {
      return `NGN ${formattedAmount}+`;
    }
    if (currencyCode === "CAD") {
      return `CAD ${formattedAmount}+`;
    }
    if (currencyCode === "AUD") {
      return `AUD ${formattedAmount}+`;
    }
  }

  const normalizedLegacy = (legacyPriceRange ?? "").trim();
  if (normalizedLegacy) {
    return normalizedLegacy;
  }

  return "Contact vendor";
}
