"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireVendorProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureVendorStorageBuckets } from "@/lib/supabase/storage";

export async function saveVendorDraftAction(formData: FormData) {
  await persistVendorProfile(formData, "draft");
}

export async function submitVendorForReviewAction(formData: FormData) {
  await persistVendorProfile(formData, "pending_review");
}

export async function updateInquiryStatusAction(formData: FormData) {
  const profile = await requireVendorProfile("/vendor/dashboard");
  const admin = createSupabaseAdminClient();

  if (!admin) {
    redirect(
      "/vendor/dashboard?error=We%20could%20not%20update%20this%20inquiry%20right%20now.",
    );
  }

  const inquiryId = String(formData.get("inquiryId") ?? "").trim();
  const threadStatus = String(formData.get("status") ?? "").trim();
  const allowedStatuses = new Set(["open", "contacted", "closed", "archived"]);

  if (!inquiryId || !allowedStatuses.has(threadStatus)) {
    redirect("/vendor/dashboard?error=We%20could%20not%20update%20this%20inquiry%20right%20now.");
  }

  const { data: vendor, error: vendorError } = await admin
    .from("vendors")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (vendorError || !vendor?.id) {
    console.error("Vendor inquiry status update failed while loading vendor", {
      table: "vendors",
      authUserId: profile.id,
      inquiryId,
      threadStatus,
      error: serializeSupabaseError(vendorError ?? {}),
    });
    redirect("/vendor/dashboard?error=We%20could%20not%20update%20this%20inquiry%20right%20now.");
  }

  console.log("Vendor inquiry status update attempt", {
    table: "leads",
    client: "service_role",
    authUserId: profile.id,
    vendorId: vendor.id,
    inquiryId,
    threadStatus,
  });

  const now = new Date().toISOString();
  const payload = {
    status: threadStatus,
    updated_at: now,
    contacted_at: threadStatus === "contacted" ? now : null,
    archived_at: threadStatus === "archived" ? now : null,
  };

  let { error } = await admin
    .from("leads")
    .update(payload)
    .eq("id", inquiryId)
    .eq("vendor_id", vendor.id);

  if (error && supportsLeadStatusFallback(error)) {
    const fallbackPayload = {
      status: mapThreadStatusToLegacyStatus(threadStatus),
      updated_at: now,
      contacted_at: threadStatus === "contacted" ? now : null,
      archived_at: threadStatus === "archived" ? now : null,
    };

    console.warn("Vendor inquiry status update retrying with compatible payload", {
      table: "leads",
      client: "service_role",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      threadStatus,
      payload: fallbackPayload,
      error: serializeSupabaseError(error),
    });

    const fallbackResult = await admin
      .from("leads")
      .update(fallbackPayload)
      .eq("id", inquiryId)
      .eq("vendor_id", vendor.id);
    error = fallbackResult.error;
  }

  if (error) {
    console.error("Vendor inquiry status update failed", {
      table: "leads",
      client: "service_role",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      threadStatus,
      payload,
      error: serializeSupabaseError(error),
    });
    redirect("/vendor/dashboard?error=We%20could%20not%20update%20this%20inquiry%20right%20now.");
  }

  revalidatePath("/vendor/dashboard");
  revalidatePath("/planner/dashboard");
  redirect("/vendor/dashboard?message=Inquiry%20status%20updated.");
}

export async function replyToInquiryAction(formData: FormData) {
  const profile = await requireVendorProfile("/vendor/dashboard");
  const admin = createSupabaseAdminClient();

  if (!admin) {
    redirect(
      "/vendor/dashboard?error=We%20could%20not%20send%20this%20reply%20right%20now.",
    );
  }

  const inquiryId = String(formData.get("inquiryId") ?? "").trim();
  const body = String(formData.get("message") ?? "").trim();

  if (!inquiryId || !body) {
    redirect("/vendor/dashboard?error=Add%20a%20reply%20before%20sending.");
  }

  const { data: vendor, error: vendorError } = await admin
    .from("vendors")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (vendorError || !vendor?.id) {
    console.error("Vendor inquiry reply failed while loading vendor", {
      table: "vendors",
      authUserId: profile.id,
      inquiryId,
      error: serializeSupabaseError(vendorError ?? {}),
    });
    redirect("/vendor/dashboard?error=We%20could%20not%20send%20this%20reply%20right%20now.");
  }

  const { data: lead, error: leadError } = await admin
    .from("leads")
    .select("id, vendor_id")
    .eq("id", inquiryId)
    .eq("vendor_id", vendor.id)
    .maybeSingle();

  if (leadError || !lead?.id) {
    console.error("Vendor inquiry reply failed while loading lead", {
      table: "leads",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      error: serializeSupabaseError(leadError ?? {}),
    });
    redirect("/vendor/dashboard?error=We%20could%20not%20send%20this%20reply%20right%20now.");
  }

  const now = new Date().toISOString();
  const messagePayload = {
    lead_id: inquiryId,
    sender_user_id: profile.id,
    message: body,
    created_at: now,
  };

  console.log("Vendor inquiry reply write attempt", {
    table: "lead_messages",
    client: "service_role",
    authUserId: profile.id,
    vendorId: vendor.id,
    inquiryId,
    payload: messagePayload,
  });

  let { error: messageError } = await admin
    .from("lead_messages")
    .insert(messagePayload);

  if (messageError && supportsLeadMessageFallback(messageError)) {
    const fallbackPayload = {
      lead_id: inquiryId,
      sender_user_id: profile.id,
      body,
      created_at: now,
    };

    console.warn("Vendor inquiry reply retrying with compatible payload", {
      table: "lead_messages",
      client: "service_role",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      payload: fallbackPayload,
      error: serializeSupabaseError(messageError),
    });

    const fallbackResult = await admin
      .from("lead_messages")
      .insert(fallbackPayload);
    messageError = fallbackResult.error;

    if (messageError && supportsLeadMessageFallback(messageError)) {
      const minimalFallbackPayload = {
        lead_id: inquiryId,
        sender_user_id: profile.id,
        message: body,
        created_at: now,
      };

      console.warn("Vendor inquiry reply retrying with minimal payload", {
        table: "lead_messages",
        client: "service_role",
        authUserId: profile.id,
        vendorId: vendor.id,
        inquiryId,
        payload: minimalFallbackPayload,
        error: serializeSupabaseError(messageError),
      });

      const minimalFallbackResult = await admin
        .from("lead_messages")
        .insert(minimalFallbackPayload);
      messageError = minimalFallbackResult.error;
    }
  }

  if (messageError) {
    console.error("Vendor inquiry reply create failed", {
      table: "lead_messages",
      client: "service_role",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      payload: messagePayload,
      error: serializeSupabaseError(messageError),
    });
    redirect("/vendor/dashboard?error=We%20could%20not%20send%20this%20reply%20right%20now.");
  }

  const statusPayload = {
    status: "contacted",
    updated_at: now,
    contacted_at: now,
  };

  let { error: statusError } = await admin
    .from("leads")
    .update(statusPayload)
    .eq("id", inquiryId)
    .eq("vendor_id", vendor.id);

  if (statusError && supportsLeadStatusFallback(statusError)) {
    const fallbackStatusPayload = {
      status: mapThreadStatusToLegacyStatus("contacted"),
      updated_at: now,
      contacted_at: now,
    };

    console.warn("Vendor inquiry reply status update retrying with compatible payload", {
      table: "leads",
      client: "service_role",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      payload: fallbackStatusPayload,
      error: serializeSupabaseError(statusError),
    });

    const fallbackStatusResult = await admin
      .from("leads")
      .update(fallbackStatusPayload)
      .eq("id", inquiryId)
      .eq("vendor_id", vendor.id);
    statusError = fallbackStatusResult.error;
  }

  if (statusError) {
    console.error("Vendor inquiry reply status update failed", {
      table: "leads",
      client: "service_role",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      payload: statusPayload,
      error: serializeSupabaseError(statusError),
    });
  }

  revalidatePath("/vendor/dashboard");
  revalidatePath("/planner/dashboard");
  redirect("/vendor/dashboard?message=Reply%20sent.");
}

async function persistVendorProfile(
  formData: FormData,
  intent: "draft" | "pending_review",
) {
  const config = getSupabaseConfigStatus();
  if (config.adminMessage) {
    redirect(
      `/vendor/dashboard?error=${encodeURIComponent(config.adminMessage)}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !admin) {
    redirect("/auth/sign-in?next=/vendor/dashboard");
  }

  const storageSetup = await ensureVendorStorageBuckets();
  if (!storageSetup.ok) {
    redirect(
      `/vendor/dashboard?error=${encodeURIComponent(storageSetup.error)}`,
    );
  }

  const businessName = String(formData.get("businessName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const phoneCode = String(formData.get("phoneCode") ?? "").trim();
  const phoneLocal = String(formData.get("phoneLocal") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const subcategory = String(formData.get("subcategory") ?? "").trim();
  const customCategory = String(formData.get("customCategory") ?? "").trim();
  const registeredBusiness =
    String(formData.get("registeredBusiness") ?? "").trim() === "yes";
  const countryRegion = String(formData.get("countryRegion") ?? "").trim();
  const nigeriaState = String(formData.get("nigeriaState") ?? "").trim();
  const regionLabel = String(formData.get("regionLabel") ?? "").trim();
  const yearsExperience = String(formData.get("yearsExperience") ?? "").trim();
  const priceCurrency = String(formData.get("priceCurrency") ?? "").trim();
  const priceAmount = String(formData.get("priceAmount") ?? "").trim();
  const primarySocialLink = String(formData.get("primarySocialLink") ?? "").trim();
  const contactEmail = String(formData.get("email") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const cultureSpecialization = String(
    formData.get("cultureSpecialization") ?? "",
  ).trim();
  const description = String(formData.get("description") ?? "").trim();
  const servicesOffered = String(formData.get("servicesOffered") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const portfolioImageUrls = parseJsonArray(formData.get("portfolioImageUrls"));
  const governmentIdPath = String(formData.get("governmentIdPath") ?? "").trim();
  const cacCertificatePath = String(formData.get("cacCertificatePath") ?? "").trim();
  const isOthersCategory = category === "Others" || category === "Other";
  const resolvedCategory = category || "Others";

  const location =
    countryRegion === "Nigeria"
      ? nigeriaState
      : regionLabel
        ? `${regionLabel}, ${countryRegion}`
        : countryRegion;

  const fullPhone = [phoneCode, phoneLocal].filter(Boolean).join(" ").trim();
  const numericPrice = priceAmount ? Number(priceAmount) : null;
  const formattedPrice =
    priceCurrency && numericPrice
      ? `${priceCurrency} ${new Intl.NumberFormat("en-US").format(numericPrice)}+`
      : null;

  if (!businessName || !resolvedCategory || !countryRegion || !location || !phoneLocal) {
    redirect(
      "/vendor/dashboard?error=Add%20your%20business%20name,%20category,%20country%20or%20region,%20location,%20and%20phone%20number%20before%20saving%20your%20profile.",
    );
  }

  if (intent === "pending_review") {
    const requiredChecks = [
      primarySocialLink,
      priceCurrency,
      priceAmount,
      description,
      servicesOffered.length ? "services" : "",
      governmentIdPath,
    ];

    if (requiredChecks.some((value) => !value) || portfolioImageUrls.length < 4) {
      redirect(
        "/vendor/dashboard?error=Complete%20the%20required%20business%20details,%20upload%20your%20government-issued%20ID,%20and%20add%20at%20least%204%20portfolio%20images%20before%20submitting%20for%20review.",
      );
    }
  }

  const metadata = user.user_metadata ?? {};
  const { error: userUpsertError } = await admin.from("users").upsert({
    id: user.id,
    email: user.email ?? String(metadata.email ?? "").trim(),
    role: "vendor",
    full_name: ownerName || String(metadata.full_name ?? "").trim() || null,
    phone: fullPhone || String(metadata.phone ?? "").trim() || null,
  });

  if (userUpsertError) {
    console.error("Vendor profile save failed while upserting user record", {
      userId: user.id,
      email: user.email,
      error: userUpsertError,
    });
    redirect(
      "/vendor/dashboard?error=We%20could%20not%20save%20your%20account%20details%20right%20now.",
    );
  }

  const { data: existingVendor, error: existingVendorError } = await admin
    .from("vendors")
    .select(
      `
        id,
        slug,
        status,
        approved,
        verified,
        business_name,
        owner_name,
        category,
        location,
        country_region,
        nigeria_state,
        phone_code,
        whatsapp,
        contact_email,
        government_id_url,
        cac_certificate_url
      `,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingVendorError) {
    console.error("Vendor profile save failed while loading vendor record", {
      userId: user.id,
      error: existingVendorError,
    });
    redirect(
      "/vendor/dashboard?error=We%20could%20not%20load%20your%20business%20record%20right%20now.",
    );
  }

  let vendorId = existingVendor?.id ?? null;
  const slug = await resolveVendorSlug(admin, businessName, existingVendor?.id ?? null);

  if (!vendorId) {
    const { data: inserted, error: insertError } = await admin
      .from("vendors")
      .insert({
        user_id: user.id,
        slug,
        business_name: businessName,
        category: resolvedCategory || "Others",
        location: location || countryRegion || "Location pending",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("Vendor profile save failed while creating vendor record", {
        userId: user.id,
        slug,
        businessName,
        category: resolvedCategory || "Others",
        location: location || countryRegion || "Location pending",
        error: insertError,
      });
      redirect(
        "/vendor/dashboard?error=We%20could%20not%20save%20your%20business%20details%20right%20now.",
      );
    }

    vendorId = inserted.id;
  }

  const status = intent === "draft" ? "draft" : "pending_review";
  const existingStatus =
    existingVendor?.status === "approved" || existingVendor?.approved
      ? "approved"
      : existingVendor?.status ?? "draft";
  const approvedVendorIsEditing = existingStatus === "approved";

  const hasMajorChanges =
    approvedVendorIsEditing &&
    hasApprovedVendorMajorChanges(existingVendor, {
      businessName,
      ownerName,
      category: resolvedCategory,
      location,
      countryRegion,
      nigeriaState,
      phoneCode,
      fullPhone,
      contactEmail: contactEmail || user.email || "",
      governmentIdPath,
      cacCertificatePath,
    });

  if (hasMajorChanges) {
    redirect(
      "/vendor/dashboard?error=For%20security,%20business%20identity%20details%20cannot%20be%20changed%20directly%20from%20your%20live%20profile.%20Please%20contact%20admin%20to%20update%20these%20details.",
    );
  }

  const nextStatus = approvedVendorIsEditing ? "approved" : status;
  const nextApproved = approvedVendorIsEditing ? true : false;
  const nextVerified = approvedVendorIsEditing
    ? existingVendor?.verified ?? true
    : false;
  const nextOnboardingCompleted = approvedVendorIsEditing
    ? true
    : intent === "pending_review";
  const nextAvailabilityStatus = approvedVendorIsEditing
    ? "Available for booking"
    : intent === "pending_review"
      ? "Submitted for review"
      : "Draft profile";
  const vendorPayload = {
    slug,
    business_name: businessName,
    owner_name: ownerName || null,
    category: resolvedCategory || "Others",
    custom_category: isOthersCategory
      ? customCategory || null
      : subcategory || null,
    registered_business: registeredBusiness,
    country_region: countryRegion || null,
    nigeria_state: countryRegion === "Nigeria" ? nigeriaState || null : null,
    phone_code: phoneCode || null,
    culture: cultureSpecialization || null,
    culture_specialization: cultureSpecialization || null,
    location: location || countryRegion || "Location pending",
    years_experience: yearsExperience || null,
    primary_social_link: primarySocialLink || null,
    contact_email: contactEmail || user.email || null,
    instagram: primarySocialLink || null,
    website: website || null,
    whatsapp: fullPhone || null,
    description: description || null,
    services_offered: servicesOffered,
    price_currency: priceCurrency || null,
    price_amount: numericPrice,
    price_range: formattedPrice,
    portfolio_image_urls: portfolioImageUrls,
    government_id_url: governmentIdPath || null,
    cac_certificate_url: registeredBusiness ? cacCertificatePath || null : null,
    status: nextStatus,
    profile_status: nextStatus,
    onboarding_completed: nextOnboardingCompleted,
    availability_status: nextAvailabilityStatus,
    value_statement:
      description || "Vendor profile details saved for marketplace review.",
    approved: nextApproved,
    verified: nextVerified,
  };

  console.log("Vendor profile write attempt", {
    table: "vendors",
    authUserId: user.id,
    vendorId,
    intent,
    payload: vendorPayload,
  });

  let { error } = await admin
    .from("vendors")
    .update(vendorPayload)
    .eq("id", vendorId);

  if (error && isSchemaDriftError(error)) {
    const fallbackPayload = {
      slug: vendorPayload.slug,
      business_name: vendorPayload.business_name,
      owner_name: vendorPayload.owner_name,
      category: vendorPayload.category,
      country_region: vendorPayload.country_region,
      nigeria_state: vendorPayload.nigeria_state,
      phone_code: vendorPayload.phone_code,
      culture: vendorPayload.culture,
      culture_specialization: vendorPayload.culture_specialization,
      location: vendorPayload.location,
      years_experience: vendorPayload.years_experience,
      primary_social_link: vendorPayload.primary_social_link,
      instagram: vendorPayload.instagram,
      website: vendorPayload.website,
      whatsapp: vendorPayload.whatsapp,
      description: vendorPayload.description,
      services_offered: vendorPayload.services_offered,
      price_currency: vendorPayload.price_currency,
      price_amount: vendorPayload.price_amount,
      price_range: vendorPayload.price_range,
      portfolio_image_urls: vendorPayload.portfolio_image_urls,
      government_id_url: vendorPayload.government_id_url,
      status: vendorPayload.status,
      profile_status: vendorPayload.profile_status,
      onboarding_completed: vendorPayload.onboarding_completed,
      availability_status: vendorPayload.availability_status,
      value_statement: vendorPayload.value_statement,
      approved: vendorPayload.approved,
      verified: vendorPayload.verified,
    };

    console.warn("Vendor profile write retrying with legacy payload", {
      table: "vendors",
      authUserId: user.id,
      vendorId,
      error: serializeSupabaseError(error),
      payload: fallbackPayload,
    });

    const fallbackResult = await admin
      .from("vendors")
      .update(fallbackPayload)
      .eq("id", vendorId);
    error = fallbackResult.error;
  }

  if (error) {
    console.error("Vendor profile save failed while updating vendor record", {
      table: "vendors",
      vendorId,
      userId: user.id,
      slug,
      status: nextStatus,
      payload: vendorPayload,
      error: serializeSupabaseError(error),
    });
    redirect(
      "/vendor/dashboard?error=We%20could%20not%20save%20your%20vendor%20profile%20right%20now.",
    );
  }

  const { error: deletePortfolioError } = await admin
    .from("vendor_portfolio")
    .delete()
    .eq("vendor_id", vendorId);

  if (deletePortfolioError) {
    console.error("Vendor profile save failed while refreshing portfolio rows", {
      vendorId,
      error: deletePortfolioError,
    });
    redirect(
      "/vendor/dashboard?error=We%20could%20not%20save%20your%20portfolio%20images%20right%20now.",
    );
  }

  if (portfolioImageUrls.length) {
    const { error: insertPortfolioError } = await admin.from("vendor_portfolio").insert(
      portfolioImageUrls.map((imageUrl, index) => ({
        vendor_id: vendorId,
        image_url: imageUrl,
        sort_order: index,
      })),
    );

    if (insertPortfolioError) {
      console.error("Vendor profile save failed while writing portfolio rows", {
        vendorId,
        error: insertPortfolioError,
      });
      redirect(
        "/vendor/dashboard?error=We%20could%20not%20save%20your%20portfolio%20images%20right%20now.",
      );
    }
  }

  revalidatePath("/vendor/dashboard");
  revalidatePath("/admin/vendors");
  revalidatePath("/vendors");

  redirect(
    approvedVendorIsEditing
      ? "/vendor/dashboard?message=Your%20changes%20have%20been%20saved%20and%20your%20listing%20remains%20live."
      : intent === "draft"
        ? "/vendor/dashboard?message=Your%20draft%20has%20been%20saved."
        : "/vendor/dashboard?message=Your%20profile%20has%20been%20submitted%20for%20review.",
  );
}

function isSchemaDriftError(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST204" ||
    (message.includes("column") &&
      (message.includes("does not exist") || message.includes("could not find")))
  );
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

function mapThreadStatusToLegacyStatus(
  value: string,
): "new" | "contacted" | "booked" {
  if (value === "contacted") {
    return "contacted";
  }
  if (value === "closed" || value === "archived") {
    return "booked";
  }
  return "new";
}

function supportsLeadMessageFallback(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST204" ||
    error.code === "42P01" ||
    (message.includes("column") &&
      (message.includes("does not exist") || message.includes("could not find"))) ||
    message.includes('relation "lead_messages" does not exist')
  );
}

function supportsLeadStatusFallback(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST204" ||
    (message.includes("column") &&
      (message.includes("does not exist") || message.includes("could not find"))) ||
    message.includes("invalid input value for enum") ||
    message.includes("not-null constraint")
  );
}

function parseJsonArray(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function buildVendorSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || `vendor-${Math.random().toString(36).slice(2, 10)}`;
}

function hasApprovedVendorMajorChanges(
  existingVendor: {
    business_name?: string | null;
    owner_name?: string | null;
    category?: string | null;
    location?: string | null;
    country_region?: string | null;
    nigeria_state?: string | null;
    phone_code?: string | null;
    whatsapp?: string | null;
    contact_email?: string | null;
    government_id_url?: string | null;
    cac_certificate_url?: string | null;
  } | null,
  nextValues: {
    businessName: string;
    ownerName: string;
    category: string;
    location: string;
    countryRegion: string;
    nigeriaState: string;
    phoneCode: string;
    fullPhone: string;
    contactEmail: string;
    governmentIdPath: string;
    cacCertificatePath: string;
  },
) {
  if (!existingVendor) {
    return false;
  }

  return (
    normalizeString(existingVendor.business_name) !== normalizeString(nextValues.businessName) ||
    normalizeString(existingVendor.owner_name) !== normalizeString(nextValues.ownerName) ||
    normalizeString(existingVendor.category) !== normalizeString(nextValues.category) ||
    normalizeString(existingVendor.location) !== normalizeString(nextValues.location) ||
    normalizeString(existingVendor.country_region) !== normalizeString(nextValues.countryRegion) ||
    normalizeString(existingVendor.nigeria_state) !== normalizeString(nextValues.nigeriaState) ||
    normalizeString(existingVendor.phone_code) !== normalizeString(nextValues.phoneCode) ||
    normalizeString(existingVendor.whatsapp) !== normalizeString(nextValues.fullPhone) ||
    normalizeString(existingVendor.contact_email) !== normalizeString(nextValues.contactEmail) ||
    normalizeString(existingVendor.government_id_url) !== normalizeString(nextValues.governmentIdPath) ||
    normalizeString(existingVendor.cac_certificate_url) !== normalizeString(nextValues.cacCertificatePath)
  );
}

function normalizeString(value: string | null | undefined) {
  return (value ?? "").trim();
}

async function resolveVendorSlug(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  value: string,
  currentVendorId: string | null,
) {
  const baseSlug = buildVendorSlug(value);
  let candidate = baseSlug;
  let counter = 1;

  while (counter < 50) {
    const { data, error } = await admin
      .from("vendors")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      console.error("Failed to check vendor slug availability", {
        candidate,
        error,
      });
      return `${baseSlug}-${Date.now().toString().slice(-6)}`;
    }

    if (!data || data.id === currentVendorId) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }

  return `${baseSlug}-${Date.now().toString().slice(-6)}`;
}
