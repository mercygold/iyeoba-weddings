"use client";

import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ForwardedRef,
} from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  VENDOR_DOCUMENTS_BUCKET,
  VENDOR_PORTFOLIO_BUCKET,
} from "@/lib/supabase/storage-constants";
import type { VendorDirectoryItem } from "@/lib/vendors";
import {
  TOP_LEVEL_VENDOR_CATEGORIES,
  normalizeVendorCategory,
} from "@/lib/vendor-categories";
import { supportedVendorCurrencies } from "@/lib/currency";
import { COUNTRY_DIAL_CODES } from "@/lib/country-dial-codes";

type VendorDashboardFormProps = {
  vendor: VendorDirectoryItem | null;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone?: string | null;
  };
};

const regionOptions = COUNTRY_DIAL_CODES.map((country) => country.name);

const nigeriaStates = [
  "Lagos",
  "Abuja",
  "Ogun",
  "Oyo",
  "Osun",
  "Ondo",
  "Ekiti",
  "Kwara",
  "Rivers",
  "Delta",
  "Anambra",
  "Enugu",
  "Imo",
  "Abia",
  "Edo",
] as const;

const cultureOptions = [
  "Yoruba weddings",
  "Igbo weddings",
  "Luxury Nigerian weddings",
  "Diaspora Nigerian weddings",
  "Traditional and white weddings",
] as const;

export function VendorDashboardForm({
  vendor,
  profile,
}: VendorDashboardFormProps) {
  const inferredRegion =
    normalizeRegionLabel(vendor?.countryRegion || "") ||
    inferRegionFromLocation(vendor?.location || "") ||
    "Nigeria";
  const regionMeta = COUNTRY_DIAL_CODES.find(
    (option) => option.name === inferredRegion,
  );

  const [countryRegion, setCountryRegion] = useState(inferredRegion);
  const normalizedVendorCategory = normalizeVendorCategory(
    vendor?.category,
    vendor?.customCategory,
  );
  const [selectedCategory, setSelectedCategory] = useState(
    normalizedVendorCategory.category || "",
  );
  const [registeredBusiness, setRegisteredBusiness] = useState(
    vendor?.registeredBusiness ?? false,
  );
  const [phoneCode, setPhoneCode] = useState(
    vendor?.phoneCode || regionMeta?.dialCode || "+234",
  );
  const resolvedInitialPriceCurrency = supportedVendorCurrencies.includes(
    String(vendor?.priceCurrency ?? "").trim().toUpperCase() as (typeof supportedVendorCurrencies)[number],
  )
    ? String(vendor?.priceCurrency ?? "").trim().toUpperCase()
    : "NGN";
  const [priceCurrency, setPriceCurrency] = useState(
    resolvedInitialPriceCurrency,
  );
  const [phoneLocal, setPhoneLocal] = useState(
    sanitizePhoneLocal(
      stripPhonePrefix(vendor?.whatsapp || profile.phone || "", phoneCode),
    ),
  );
  const [portfolioImages, setPortfolioImages] = useState<string[]>(
    vendor?.portfolioImageUrls ? [...vendor.portfolioImageUrls] : [],
  );
  const [governmentIdPath, setGovernmentIdPath] = useState(
    vendor?.governmentIdUrl || "",
  );
  const [cacCertificatePath, setCacCertificatePath] = useState(
    vendor?.cacCertificateUrl || "",
  );
  const [uploadState, setUploadState] = useState<{
    portfolio: boolean;
    governmentId: boolean;
    cacCertificate: boolean;
    error: string | null;
  }>({
    portfolio: false,
    governmentId: false,
    cacCertificate: false,
    error: null,
  });
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const portfolioInputRef = useRef<HTMLInputElement | null>(null);
  const governmentIdInputRef = useRef<HTMLInputElement | null>(null);
  const cacCertificateInputRef = useRef<HTMLInputElement | null>(null);

  const showNigeriaState = countryRegion === "Nigeria";
  const locationLabel = showNigeriaState ? "Nigerian State" : "City / Region";

  const formDefaults = useMemo(
    () => ({
      businessName: vendor?.businessName || "",
      ownerName: vendor?.ownerName || profile.full_name || "",
      category: normalizedVendorCategory.category || "",
      customCategory:
        normalizedVendorCategory.category === "Other"
          ? normalizedVendorCategory.subcategory || ""
          : "",
      nigeriaState: vendor?.nigeriaState || "",
      regionLabel:
        countryRegion === "Nigeria"
          ? ""
          : extractRegionLabel(vendor?.location || "", countryRegion),
      yearsExperience: vendor?.yearsExperience || "",
      priceAmount:
        vendor?.priceAmount && Number.isFinite(vendor.priceAmount)
          ? String(vendor.priceAmount)
          : "",
      primarySocialLink: vendor?.primarySocialLink || vendor?.instagram || "",
      website: vendor?.website || "",
      cultureSpecialization: vendor?.cultureSpecialization || "",
      description: vendor?.description || "",
      servicesOffered: vendor?.servicesOffered?.join(", ") || "",
    }),
    [countryRegion, normalizedVendorCategory, profile.full_name, vendor],
  );

  async function handlePortfolioUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    if (portfolioImages.length + files.length > 12) {
      setUploadState((state) => ({
        ...state,
        error: "You can upload up to 12 portfolio images.",
      }));
      return;
    }

    setUploadState((state) => ({
      ...state,
      portfolio: true,
      error: null,
    }));

    try {
      const supabase = createSupabaseBrowserClient();
      const uploaded: string[] = [];

      for (const [index, file] of files.entries()) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Portfolio uploads must be image files.");
        }

        const response = await fetch("/api/vendor/uploads/sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bucket: VENDOR_PORTFOLIO_BUCKET,
            fileName: file.name || `portfolio-${index}.jpg`,
            contentType: file.type,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          path?: string;
          token?: string;
          publicUrl?: string | null;
        };

        if (!response.ok || !payload.path || !payload.token) {
          throw new Error(
            payload.error || "We could not prepare your portfolio upload.",
          );
        }

        const { error } = await supabase.storage
          .from(VENDOR_PORTFOLIO_BUCKET)
          .uploadToSignedUrl(payload.path, payload.token, file, {
            contentType: file.type,
          });

        if (error) {
          throw error;
        }

        if (payload.publicUrl) {
          uploaded.push(payload.publicUrl);
        }
      }

      setPortfolioImages((current) => [...current, ...uploaded]);
      if (portfolioInputRef.current) {
        portfolioInputRef.current.value = "";
      }
      setUploadState((state) => ({ ...state, portfolio: false, error: null }));
    } catch (error) {
      setUploadState((state) => ({
        ...state,
        portfolio: false,
        error:
          error instanceof Error
            ? humanizeUploadError(error.message, "portfolio images")
            : "We could not upload your portfolio images right now.",
      }));
    }
  }

  async function handleGovernmentIdUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!(file.type.startsWith("image/") || file.type === "application/pdf")) {
      setUploadState((state) => ({
        ...state,
        error: "Government ID must be an image or PDF file.",
      }));
      return;
    }

    setUploadState((state) => ({
      ...state,
      governmentId: true,
      error: null,
    }));

    try {
      const supabase = createSupabaseBrowserClient();
      const response = await fetch("/api/vendor/uploads/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucket: VENDOR_DOCUMENTS_BUCKET,
          fileName: file.name || "government-id",
          contentType: file.type,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        path?: string;
        token?: string;
      };

      if (!response.ok || !payload.path || !payload.token) {
        throw new Error(
          payload.error || "We could not prepare your verification upload.",
        );
      }

      const { error } = await supabase.storage
        .from(VENDOR_DOCUMENTS_BUCKET)
        .uploadToSignedUrl(payload.path, payload.token, file, {
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      setGovernmentIdPath(payload.path);
      if (governmentIdInputRef.current) {
        governmentIdInputRef.current.value = "";
      }
      setUploadState((state) => ({ ...state, governmentId: false, error: null }));
    } catch (error) {
      setUploadState((state) => ({
        ...state,
        governmentId: false,
        error:
          error instanceof Error
            ? humanizeUploadError(error.message, "your verification document")
            : "We could not upload your verification document right now.",
      }));
    }
  }

  async function handleCacUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!(file.type.startsWith("image/") || file.type === "application/pdf")) {
      setUploadState((state) => ({
        ...state,
        error: "Business registration certificate must be an image or PDF file.",
      }));
      return;
    }

    setUploadState((state) => ({
      ...state,
      cacCertificate: true,
      error: null,
    }));

    try {
      const supabase = createSupabaseBrowserClient();
      const response = await fetch("/api/vendor/uploads/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucket: VENDOR_DOCUMENTS_BUCKET,
          fileName: file.name || "business-registration",
          contentType: file.type,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        path?: string;
        token?: string;
      };

      if (!response.ok || !payload.path || !payload.token) {
        throw new Error(
          payload.error || "We could not prepare your business registration upload.",
        );
      }

      const { error } = await supabase.storage
        .from(VENDOR_DOCUMENTS_BUCKET)
        .uploadToSignedUrl(payload.path, payload.token, file, {
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      setCacCertificatePath(payload.path);
      if (cacCertificateInputRef.current) {
        cacCertificateInputRef.current.value = "";
      }
      setUploadState((state) => ({ ...state, cacCertificate: false, error: null }));
    } catch (error) {
      setUploadState((state) => ({
        ...state,
        cacCertificate: false,
        error:
          error instanceof Error
            ? humanizeUploadError(error.message, "your business registration document")
            : "We could not upload your business registration document right now.",
      }));
    }
  }

  function handleRegionChange(nextRegion: string) {
    setCountryRegion(nextRegion);
  }

  return (
    <form action="/vendor/dashboard/update" method="post" noValidate className="mt-8 grid gap-8">
      <div className="rounded-[1.5rem] border border-[rgba(201,161,91,0.3)] bg-[rgba(201,161,91,0.12)] px-5 py-4 text-sm leading-7 text-[color:var(--color-ink)]">
        Business identity fields require admin review after approval. Pricing,
        portfolio, website, services, and social links update directly.
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <>
          <Field
            label="Business / Brand Name"
            name="businessName"
            defaultValue={formDefaults.businessName}
            helperText="Use the name customers know your business by. Do not enter only your personal name unless it is also your business name."
            required
          />
          <Field label="Owner Name" name="ownerName" defaultValue={formDefaults.ownerName} required />
          <Field
            label="Email Address"
            name="email"
            type="email"
            defaultValue={profile.email || ""}
            required
          />
          <PhoneField
            phoneCode={phoneCode}
            onPhoneCodeChange={setPhoneCode}
            phoneLocal={phoneLocal}
            onPhoneLocalChange={setPhoneLocal}
            required
          />
          <SelectField
            label="Business Category"
            name="category"
            options={TOP_LEVEL_VENDOR_CATEGORIES}
            defaultValue={selectedCategory}
            required
            onChangeValue={(value) => {
              setSelectedCategory(value);
            }}
          />
          {selectedCategory === "Other" ? (
            <Field
              label="Write what you do"
              name="customCategory"
              defaultValue={formDefaults.customCategory}
              placeholder="e.g. MUA, bridal robe vendor, champagne tower service, henna artist, bridal stylist, etc."
              helperText="Use this only if your service is not listed in the main categories."
              required
            />
          ) : null}
          <SelectField
            label="Country / Region"
            name="countryRegion"
            options={regionOptions}
            defaultValue={countryRegion}
            required
            onChangeValue={handleRegionChange}
          />
          {showNigeriaState ? (
            <SelectField
              label={locationLabel}
              name="nigeriaState"
              options={nigeriaStates}
              defaultValue={formDefaults.nigeriaState}
              required
            />
          ) : (
            <Field
              label={locationLabel}
              name="regionLabel"
              defaultValue={formDefaults.regionLabel}
              placeholder="City / region"
              required
            />
          )}
        </>
        <Field
          label="Years of Experience"
          name="yearsExperience"
          defaultValue={formDefaults.yearsExperience}
          optional
          placeholder="e.g. 5 years"
        />
        <PriceField
          priceCurrency={priceCurrency}
          priceAmount={formDefaults.priceAmount}
          onPriceCurrencyChange={setPriceCurrency}
        />
        <Field
          label="Social Media / Portfolio Link"
          name="primarySocialLink"
          defaultValue={formDefaults.primarySocialLink}
          placeholder="Instagram, TikTok, Behance, or another business portfolio link"
          helperText="Required before submission: add Instagram, TikTok, Facebook, your website, or another portfolio link."
          required
        />
        <Field
          label="Website"
          name="website"
          defaultValue={formDefaults.website}
          optional
          placeholder="https://yourbusiness.com"
          helperText="A website can satisfy the social proof requirement if you do not use a social media portfolio."
        />
        <SelectField
          label="Culture Specialization"
          name="cultureSpecialization"
          options={cultureOptions}
          defaultValue={formDefaults.cultureSpecialization}
          optional
        />
        <RadioField
          label="Are you a registered business?"
          name="registeredBusiness"
          value={registeredBusiness ? "yes" : "no"}
          onChangeValue={(value) => setRegisteredBusiness(value === "yes")}
          options={[
            { label: "Yes", value: "yes" },
            { label: "No", value: "no" },
          ]}
          optional
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TextAreaField
          label="Short Business Description"
          name="description"
          defaultValue={formDefaults.description}
          placeholder="Describe your business, style, and the weddings you serve best."
        />
        <TextAreaField
          label="Services Offered"
          name="servicesOffered"
          defaultValue={formDefaults.servicesOffered}
          placeholder="Comma-separated list, e.g. Bridal glam, Traditional glam, Touch-up support"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <UploadField
          ref={portfolioInputRef}
          label="Portfolio Images"
          required
          accept="image/*"
          multiple
          helperText="Upload at least 1 strong work image before submitting. Recommended size: 1600 x 2000px or larger, with the subject centered for clean marketplace cropping."
          uploading={uploadState.portfolio}
          onChange={handlePortfolioUpload}
        />
        <div className="surface-soft rounded-[1.5rem] p-5 text-sm leading-7 text-[color:var(--color-muted)]">
          <p className="font-semibold text-[color:var(--color-ink)]">
            Portfolio readiness
          </p>
          <p className="mt-2">
            Couples will first see these images in your profile gallery and listing
            previews, so choose polished work that reflects your best wedding style.
          </p>
          <p className="mt-3">Uploaded images: {portfolioImages.length}</p>
          {portfolioImages.length ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {portfolioImages.map((imageUrl) => (
                <div key={imageUrl} className="relative aspect-[4/5] overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Uploaded portfolio preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white"
                    onClick={() =>
                      setPortfolioImages((current) =>
                        current.filter((entry) => entry !== imageUrl),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <UploadField
          ref={governmentIdInputRef}
          label="Government-issued ID"
          accept=".pdf,image/*"
          helperText="Upload a valid government-issued ID for verification. This document is stored securely, kept private, and never displayed publicly. It is used only for identity verification and review."
          uploading={uploadState.governmentId}
          onChange={handleGovernmentIdUpload}
        />
        <div className="surface-soft rounded-[1.5rem] p-5 text-sm leading-7 text-[color:var(--color-muted)]">
          <p className="font-semibold text-[color:var(--color-ink)]">
            Review and publication
          </p>
          <p className="mt-2">
            Save Draft stores your progress privately. Submit sends your
            profile into the review queue so it can be approved for marketplace publication.
          </p>
          <p className="mt-3">
            Government ID status: {governmentIdPath ? "Uploaded" : "Awaiting upload"}
          </p>
          {registeredBusiness ? (
            <p className="mt-3">
              Business registration certificate: {cacCertificatePath ? "Uploaded" : "Optional"}
            </p>
          ) : null}
          {uploadState.error ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {uploadState.error}
            </p>
          ) : null}
        </div>
      </div>

      {registeredBusiness ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <UploadField
            ref={cacCertificateInputRef}
            label="CAC / Business Registration Certificate"
            accept=".pdf,image/*"
            helperText="If your business is formally registered, you can upload the supporting certificate here for internal review. This document is optional."
            uploading={uploadState.cacCertificate}
            onChange={handleCacUpload}
          />
          <div className="surface-soft rounded-[1.5rem] p-5 text-sm leading-7 text-[color:var(--color-muted)]">
            <p className="font-semibold text-[color:var(--color-ink)]">
              Registered business support
            </p>
            <p className="mt-2">
              This document can support internal review for businesses that operate with formal registration details.
            </p>
            <p className="mt-3">
              Certificate status: {cacCertificatePath ? "Uploaded" : "Optional"}
            </p>
          </div>
        </div>
      ) : null}

      <input type="hidden" name="phoneCode" value={phoneCode} />
      <input type="hidden" name="phoneLocal" value={phoneLocal} />
      <input type="hidden" name="priceCurrency" value={priceCurrency} />
      <input type="hidden" name="portfolioImageUrls" value={JSON.stringify(portfolioImages)} />
      <input type="hidden" name="governmentIdPath" value={governmentIdPath} />
      <input type="hidden" name="cacCertificatePath" value={cacCertificatePath} />

      <div className="flex flex-col gap-4 border-t border-[rgba(106,62,124,0.08)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-7 text-[color:var(--color-muted)]">
          Draft profiles stay private until you submit them. Submitted profiles are
          reviewed before they are published in the marketplace.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            name="intent"
            value="draft"
            className="btn-secondary"
            formNoValidate
            onClick={() => setActionFeedback("Draft saved only.")}
          >
            Save Draft
          </button>
          <button
            type="submit"
            name="intent"
            value="publish"
            className="btn-secondary"
            onClick={() => {
              console.log("PUBLISH_BUTTON_CLICKED");
              setActionFeedback("Your listing updates are now live.");
            }}
          >
            Publish Updates
          </button>
          <button
            type="submit"
            name="intent"
            value="submit"
            className="btn-primary"
            onClick={() => {
              console.log("SUBMIT_BUTTON_CLICKED");
              setActionFeedback(
                "Your business identity changes have been sent to admin for review. You will receive a response within 3 business days.",
              );
            }}
          >
            Submit
          </button>
        </div>
      </div>
      {actionFeedback ? (
        <p className="text-sm text-[color:var(--color-brand-primary)]">
          {actionFeedback}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  helperText,
  required = false,
  optional = false,
  type = "text",
  readOnly = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  optional?: boolean;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      <LabelText label={label} required={required} optional={optional} />
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className="field-input rounded-[1.25rem]"
      />
      {helperText ? (
        <p className="text-xs leading-5 text-[color:var(--color-muted)]">
          {helperText}
        </p>
      ) : null}
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
  optional = true,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      <LabelText label={label} optional={optional} />
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={5}
        className="field-input min-h-[144px] rounded-[1.25rem]"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  required = false,
  optional = false,
  onChangeValue,
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string;
  required?: boolean;
  optional?: boolean;
  onChangeValue?: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      <LabelText label={label} required={required} optional={optional} />
      <select
        name={name}
        defaultValue={defaultValue || ""}
        required={required}
        onChange={(event) => onChangeValue?.(event.target.value)}
        className="field-input rounded-[1.25rem]"
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RadioField({
  label,
  name,
  value,
  options,
  onChangeValue,
  optional = false,
}: {
  label: string;
  name: string;
  value: string;
  options: { label: string; value: string }[];
  onChangeValue: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <fieldset className="grid gap-3 text-sm font-medium text-[color:var(--color-ink)]">
      <legend>
        <LabelText label={label} optional={optional} />
      </legend>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 rounded-full border border-[rgba(106,62,124,0.12)] px-4 py-2 text-sm"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(event) => onChangeValue(event.target.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PhoneField({
  phoneCode,
  onPhoneCodeChange,
  phoneLocal,
  onPhoneLocalChange,
  required = false,
}: {
  phoneCode: string;
  onPhoneCodeChange: (value: string) => void;
  phoneLocal: string;
  onPhoneLocalChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      <LabelText label="Phone Number" required={required} />
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <select
          value={phoneCode}
          onChange={(event) => onPhoneCodeChange(event.target.value)}
          className="field-input rounded-[1.25rem]"
        >
          {COUNTRY_DIAL_CODES.map((country) => (
            <option key={`${country.countryCode}-${country.dialCode}`} value={country.dialCode}>
              {country.name} ({country.dialCode})
            </option>
          ))}
        </select>
        <input
          value={phoneLocal}
          onChange={(event) => onPhoneLocalChange(sanitizePhoneLocal(event.target.value))}
          placeholder="801 234 5678"
          inputMode="tel"
          pattern="[0-9\\s\\-\\(\\)]{6,20}"
          required={required}
          className="field-input rounded-[1.25rem]"
        />
      </div>
    </div>
  );
}

function PriceField({
  priceCurrency,
  priceAmount,
  onPriceCurrencyChange,
}: {
  priceCurrency: string;
  priceAmount: string;
  onPriceCurrencyChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      <LabelText label="Starting Price" optional />
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <select
          value={priceCurrency}
          onChange={(event) => onPriceCurrencyChange(event.target.value)}
          className="field-input rounded-[1.25rem]"
        >
          {supportedVendorCurrencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        <input
          name="priceAmount"
          type="number"
          min="0"
          defaultValue={priceAmount}
          placeholder="250000"
          className="field-input rounded-[1.25rem]"
        />
      </div>
    </div>
  );
}

function LabelText({
  label,
  required = false,
  optional = false,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
}) {
  if (required) {
    return (
      <span>
        {label} <span className="text-[#b42318]">*</span>
      </span>
    );
  }
  if (optional) {
    return (
      <span>
        {label} <span className="text-xs font-normal text-[color:var(--color-muted)]">(optional)</span>
      </span>
    );
  }
  return <span>{label}</span>;
}

function UploadFieldImpl(
  {
    label,
    accept,
    helperText,
    required = false,
    multiple = false,
    uploading,
    onChange,
    disabled = false,
  }: {
    label: string;
    accept: string;
    helperText: string;
    required?: boolean;
    multiple?: boolean;
    uploading: boolean;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
  },
  ref: ForwardedRef<HTMLInputElement>,
) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      <LabelText label={label} required={required} />
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required}
        onChange={onChange}
        disabled={disabled || uploading}
        className="field-input rounded-[1.25rem] file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--color-brand-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
      <p className="text-xs leading-6 text-[color:var(--color-muted)]">
        {disabled ? "This verification field is locked on live approved profiles." : uploading ? "Uploading..." : helperText}
      </p>
    </label>
  );
}

const UploadField = forwardRef(UploadFieldImpl);

function inferRegionFromLocation(location: string) {
  const normalized = location.toLowerCase();
  if (
    ["lagos", "abuja", "ogun", "oyo", "osun", "ondo", "ekiti", "kwara"].some(
      (entry) => normalized.includes(entry),
    )
  ) {
    return "Nigeria";
  }
  if (normalized.includes("texas") || normalized.includes("usa")) {
    return "United States";
  }
  if (normalized.includes("canada")) {
    return "Canada";
  }
  if (normalized.includes("united kingdom") || normalized.includes("london")) {
    return "United Kingdom";
  }
  return "";
}

function extractRegionLabel(location: string, countryRegion: string) {
  if (!location) {
    return "";
  }
  return location.replace(`, ${countryRegion}`, "");
}

function stripPhonePrefix(phone: string, code: string) {
  return phone.replace(code, "").trim();
}

function normalizeRegionLabel(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }
  if (normalized === "USA") {
    return "United States";
  }
  if (normalized === "UK") {
    return "United Kingdom";
  }
  return normalized;
}

function sanitizePhoneLocal(value: string) {
  return value.replace(/[^\d\s\-()]/g, "");
}

function humanizeUploadError(message: string, label: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("bucket not found")) {
    return `We could not prepare secure storage for ${label} yet. Refresh the page and try again.`;
  }

  return message;
}
