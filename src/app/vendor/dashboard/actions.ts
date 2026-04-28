"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireVendorProfile } from "@/lib/auth";
import {
  formatVendorStartingPrice,
  supportedVendorCurrencies,
} from "@/lib/currency";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureVendorStorageBuckets } from "@/lib/supabase/storage";

export async function saveVendorDraftAction(formData: FormData) {
  console.log("SAVE_DRAFT_ONLY_RUNNING");
  console.log("SAVE_DRAFT_ACTION_RUNNING");
  await persistVendorProfile(formData, "draft");
}

export async function publishVendorListingUpdatesAction(formData: FormData) {
  console.log("PUBLISH_UPDATES_ONLY_RUNNING");
  await persistVendorProfile(formData, "publish");
}

export async function submitVendorForReviewAction(formData: FormData) {
  console.log("SUBMIT_REVIEW_ONLY_RUNNING");
  await persistVendorProfile(formData, "pending_review");
}

export async function saveOrSubmitVendorProfileAction(formData: FormData) {
  const intent = String(formData.get("intent") ?? "").trim().toLowerCase();
  console.log("ACTION_STARTED", {
    intent,
    formKeys: [...formData.keys()],
  });
  if (intent === "draft") {
    console.log("VENDOR_FORM_INTENT_DRAFT");
    console.log("SAVE_DRAFT_ONLY_RUNNING");
    await persistVendorProfile(formData, "draft");
    return;
  }
  if (intent === "publish") {
    console.log("VENDOR_FORM_INTENT_PUBLISH");
    console.log("PUBLISH_UPDATES_ONLY_RUNNING");
    await persistVendorProfile(formData, "publish");
    return;
  }
  console.log("VENDOR_FORM_INTENT_SUBMIT");
  console.log("SUBMIT_REVIEW_ONLY_RUNNING");
  await persistVendorProfile(formData, "pending_review");
}

export async function updateInquiryStatusAction(formData: FormData) {
  const profile = await requireVendorProfile("/vendor/dashboard");
  const supabase = await createSupabaseServerClient();

  const inquiryId = String(formData.get("inquiryId") ?? "").trim();
  const threadStatus = String(formData.get("status") ?? "").trim();
  const nextPath = normalizeVendorDashboardNextPath(formData.get("nextPath"));
  const allowedStatuses = new Set(["open", "contacted", "closed", "archived"]);

  if (!inquiryId || !allowedStatuses.has(threadStatus)) {
    redirect(
      withQueryParam(
        nextPath,
        "error",
        "We could not update this inquiry right now.",
      ),
    );
  }

  const { data: vendor, error: vendorError } = await supabase
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
    redirect(
      withQueryParam(
        nextPath,
        "error",
        "We could not update this inquiry right now.",
      ),
    );
  }

  console.log("Vendor inquiry status update attempt", {
    table: "leads",
    client: "authenticated_server",
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

  let { error } = await supabase
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
      client: "authenticated_server",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      threadStatus,
      payload: fallbackPayload,
      error: serializeSupabaseError(error),
    });

    const fallbackResult = await supabase
      .from("leads")
      .update(fallbackPayload)
      .eq("id", inquiryId)
      .eq("vendor_id", vendor.id);
    error = fallbackResult.error;
  }

  if (error && isRlsDeniedError(error)) {
    console.error("Vendor inquiry status update blocked by RLS", {
      table: "leads",
      client: "authenticated_server",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      threadStatus,
      payload,
      error: serializeSupabaseError(error),
    });
  }

  if (error) {
    console.error("Vendor inquiry status update failed", {
      table: "leads",
      client: "authenticated_server",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      threadStatus,
      payload,
      error: serializeSupabaseError(error),
    });
    redirect(
      withQueryParam(
        nextPath,
        "error",
        "We could not update this inquiry right now.",
      ),
    );
  }

  revalidatePath("/vendor/dashboard");
  revalidatePath("/planner/dashboard");
  redirect(withQueryParam(nextPath, "message", "Inquiry status updated."));
}

export async function replyToInquiryAction(formData: FormData) {
  const profile = await requireVendorProfile("/vendor/dashboard");
  const supabase = await createSupabaseServerClient();

  const inquiryId = String(formData.get("inquiryId") ?? "").trim();
  const body = String(formData.get("message") ?? "").trim();
  const nextPath = normalizeVendorDashboardNextPath(formData.get("nextPath"));

  if (!inquiryId || !body) {
    redirect(withQueryParam(nextPath, "error", "Add a reply before sending."));
  }

  const { data: vendor, error: vendorError } = await supabase
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
    redirect(
      withQueryParam(
        nextPath,
        "error",
        "We could not send this reply right now.",
      ),
    );
  }

  const { data: lead, error: leadError } = await supabase
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
    redirect(
      withQueryParam(
        nextPath,
        "error",
        "We could not send this reply right now.",
      ),
    );
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
    client: "authenticated_server",
    authUserId: profile.id,
    vendorId: vendor.id,
    inquiryId,
    payload: messagePayload,
  });

  let { error: messageError } = await supabase
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
      client: "authenticated_server",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      payload: fallbackPayload,
      error: serializeSupabaseError(messageError),
    });

    const fallbackResult = await supabase
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
        client: "authenticated_server",
        authUserId: profile.id,
        vendorId: vendor.id,
        inquiryId,
        payload: minimalFallbackPayload,
        error: serializeSupabaseError(messageError),
      });

      const minimalFallbackResult = await supabase
        .from("lead_messages")
        .insert(minimalFallbackPayload);
      messageError = minimalFallbackResult.error;
    }
  }

  if (messageError && isRlsDeniedError(messageError)) {
    console.error("Vendor inquiry reply blocked by RLS", {
      table: "lead_messages",
      client: "authenticated_server",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      payload: messagePayload,
      error: serializeSupabaseError(messageError),
    });
  }

  if (messageError) {
    console.error("Vendor inquiry reply create failed", {
      table: "lead_messages",
      client: "authenticated_server",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      payload: messagePayload,
      error: serializeSupabaseError(messageError),
    });
    redirect(
      withQueryParam(
        nextPath,
        "error",
        "We could not send this reply right now.",
      ),
    );
  }

  const statusPayload = {
    status: "contacted",
    updated_at: now,
    contacted_at: now,
  };

  let { error: statusError } = await supabase
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
      client: "authenticated_server",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      payload: fallbackStatusPayload,
      error: serializeSupabaseError(statusError),
    });

    const fallbackStatusResult = await supabase
      .from("leads")
      .update(fallbackStatusPayload)
      .eq("id", inquiryId)
      .eq("vendor_id", vendor.id);
    statusError = fallbackStatusResult.error;
  }

  if (statusError) {
    console.error("Vendor inquiry reply status update failed", {
      table: "leads",
      client: "authenticated_server",
      authUserId: profile.id,
      vendorId: vendor.id,
      inquiryId,
      payload: statusPayload,
      error: serializeSupabaseError(statusError),
    });
  }

  revalidatePath("/vendor/dashboard");
  revalidatePath("/planner/dashboard");
  redirect(withQueryParam(nextPath, "message", "Reply sent."));
}

function normalizeVendorDashboardNextPath(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/vendor/dashboard")) {
    return "/vendor/dashboard";
  }
  return value;
}

function withQueryParam(path: string, key: string, value: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("error");
  params.delete("message");
  params.set(key, value);
  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

async function persistVendorProfile(
  formData: FormData,
  intent: "draft" | "publish" | "pending_review",
) {
  const config = getSupabaseConfigStatus();
  if (config.adminMessage) {
    console.error("Vendor profile save blocked by Supabase configuration", {
      adminMessage: config.adminMessage,
    });
    redirect(
      "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20profile%20right%20now.%20Please%20try%20again%20shortly.",
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

  console.log("VENDOR_PERSIST_STARTED", {
    intent,
    userId: user.id,
  });

  const storageSetup = await ensureVendorStorageBuckets();
  if (!storageSetup.ok) {
    console.error("Vendor profile save blocked by storage setup", {
      storageError: storageSetup.error,
    });
    redirect(
      "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20profile%20right%20now.%20Please%20try%20again%20shortly.",
    );
  }

  const businessName = String(formData.get("businessName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const phoneCode = String(formData.get("phoneCode") ?? "").trim();
  const phoneLocal = String(formData.get("phoneLocal") ?? "").trim();
  const normalizedPhoneLocal = normalizePhoneLocal(phoneLocal);
  const category = String(formData.get("category") ?? "").trim();
  const subcategory = String(formData.get("subcategory") ?? "").trim();
  const customCategory = String(formData.get("customCategory") ?? "").trim();
  const registeredBusiness =
    String(formData.get("registeredBusiness") ?? "").trim() === "yes";
  const countryRegion = String(formData.get("countryRegion") ?? "").trim();
  const nigeriaState = String(formData.get("nigeriaState") ?? "").trim();
  const regionLabel = String(formData.get("regionLabel") ?? "").trim();
  const yearsExperience = String(formData.get("yearsExperience") ?? "").trim();
  const priceCurrencyInput = String(formData.get("priceCurrency") ?? "").trim().toUpperCase();
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

  const fullPhone = `${normalizePhoneCode(phoneCode)}${normalizedPhoneLocal}`;
  const effectiveEmail = contactEmail || user.email || "";
  const numericPrice = priceAmount ? Number(priceAmount) : null;
  const priceCurrency = supportedVendorCurrencies.includes(
    priceCurrencyInput as (typeof supportedVendorCurrencies)[number],
  )
    ? (priceCurrencyInput as (typeof supportedVendorCurrencies)[number])
    : "NGN";
  const formattedPrice = formatVendorStartingPrice({
    currencyCode: priceCurrency,
    startingPrice: Number.isFinite(numericPrice) ? numericPrice : null,
    priceLabel: null,
    legacyPriceRange: null,
  });

  if (intent === "publish") {
    console.log("PUBLISH_UPDATES_ONLY_RUNNING", { authUserId: user.id });
    const publishLookup = await queryVendorForAction(admin, user.id, {
      select:
        "id,user_id,approved,status,currency_code,starting_price,price_currency,price_amount,price_last_updated_at,created_at",
      context: "publish",
    });

    console.log("Publish vendor lookup", {
      authUserId: user.id,
      filter: { user_id: user.id },
      returnedRowCount: Array.isArray(publishLookup.data)
        ? publishLookup.data.length
        : 0,
      error: publishLookup.error ? serializeSupabaseError(publishLookup.error) : null,
    });

    if (publishLookup.error) {
      console.error("Publish lookup failed", {
        authUserId: user.id,
        error: serializeSupabaseError(publishLookup.error),
      });
      redirect(
        "/vendor/dashboard?edit=1&error=We%20could%20not%20load%20your%20business%20record%20right%20now.",
      );
    }

    const vendorRow =
      Array.isArray(publishLookup.data) && publishLookup.data.length
        ? publishLookup.data[0]
        : null;

    console.log("Publish vendor chosen row", {
      authUserId: user.id,
      vendorId: vendorRow?.id ?? null,
      vendorUserId: vendorRow?.user_id ?? null,
      approved: vendorRow?.approved ?? null,
      status: vendorRow?.status ?? null,
    });

    if (!vendorRow?.id) {
      redirect(
        "/vendor/dashboard?edit=1&error=No%20vendor%20profile%20found%20for%20this%20account.",
      );
    }

    const existingCurrencyCode = normalizeCurrencyCode(
      vendorRow.currency_code,
      vendorRow.price_currency,
    );
    const existingStartingPrice = readNumericValue(
      vendorRow.starting_price,
      vendorRow.price_amount,
    );
    const existingPriceLastUpdatedAt = readIsoTimestamp(
      vendorRow.price_last_updated_at,
    );
    const nextStartingPrice = Number.isFinite(numericPrice) ? numericPrice : null;
    const priceChanged =
      existingCurrencyCode !== priceCurrency ||
      !areNumbersEqual(existingStartingPrice, nextStartingPrice);
    let canPublishPriceFields = true;
    let pricingCooldownBlocked = false;

    if (priceChanged) {
      const lastUpdatedMs = toMs(existingPriceLastUpdatedAt);
      const nowMs = Date.now();
      const cooldownMs = 24 * 60 * 60 * 1000;
      if (lastUpdatedMs && nowMs - lastUpdatedMs < cooldownMs) {
        canPublishPriceFields = false;
        pricingCooldownBlocked = true;
        console.warn("Publish pricing cooldown active; skipping price field update", {
          authUserId: user.id,
          vendorId: vendorRow.id,
          existingPriceLastUpdatedAt,
        });
      }
    }

    const safeUpdatePayload = {
      years_experience: yearsExperience || null,
      primary_social_link: primarySocialLink || null,
      instagram: primarySocialLink || null,
      website: website || null,
      culture: cultureSpecialization || null,
      culture_specialization: cultureSpecialization || null,
      description: description || null,
      services_offered: servicesOffered,
      portfolio_image_urls: portfolioImageUrls,
      ...(canPublishPriceFields
        ? {
            currency_code: priceCurrency,
            starting_price: Number.isFinite(numericPrice) ? numericPrice : null,
            price_currency: priceCurrency,
            price_amount: Number.isFinite(numericPrice) ? numericPrice : null,
            price_range: formattedPrice,
            price_label: formattedPrice,
            price_last_updated_at: priceChanged
              ? new Date().toISOString()
              : existingPriceLastUpdatedAt,
          }
        : {}),
    };

    console.log("Publish safe update payload", {
      authUserId: user.id,
      vendorId: vendorRow.id,
      payload: safeUpdatePayload,
    });

    const publishUpdateResult = await admin
      .from("vendors")
      .update(safeUpdatePayload)
      .eq("id", vendorRow.id)
      .eq("user_id", user.id);

    if (publishUpdateResult.error) {
      console.error("Publish safe update failed", {
        authUserId: user.id,
        vendorId: vendorRow.id,
        error: serializeSupabaseError(publishUpdateResult.error),
      });
      redirect(
        "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20listing%20updates%20right%20now.",
      );
    }

    if (priceChanged && canPublishPriceFields) {
      const historyPayload = {
        vendor_id: vendorRow.id,
        changed_by: user.id,
        old_currency_code: existingCurrencyCode,
        old_starting_price:
          existingStartingPrice === null ? null : String(existingStartingPrice),
        new_currency_code: priceCurrency,
        new_starting_price:
          nextStartingPrice === null ? null : String(nextStartingPrice),
      };

      const historyResult = await admin
        .from("vendor_price_history")
        .insert(historyPayload);

      if (historyResult.error) {
        console.error("Publish price history insert failed", {
          authUserId: user.id,
          vendorId: vendorRow.id,
          payload: historyPayload,
          error: serializeSupabaseError(historyResult.error),
        });
      }
    }

    const deletePortfolioResult = await admin
      .from("vendor_portfolio")
      .delete()
      .eq("vendor_id", vendorRow.id);

    if (deletePortfolioResult.error) {
      console.error("Publish portfolio refresh delete failed", {
        authUserId: user.id,
        vendorId: vendorRow.id,
        error: serializeSupabaseError(deletePortfolioResult.error),
      });
      redirect(
        "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20portfolio%20images%20right%20now.",
      );
    }

    if (portfolioImageUrls.length) {
      const insertPortfolioResult = await admin.from("vendor_portfolio").insert(
        portfolioImageUrls.map((imageUrl, index) => ({
          vendor_id: vendorRow.id,
          image_url: imageUrl,
          sort_order: index,
        })),
      );

      if (insertPortfolioResult.error) {
        console.error("Publish portfolio refresh insert failed", {
          authUserId: user.id,
          vendorId: vendorRow.id,
          error: serializeSupabaseError(insertPortfolioResult.error),
        });
        redirect(
          "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20portfolio%20images%20right%20now.",
        );
      }
    }

    revalidatePath("/vendor/dashboard");
    revalidatePath("/admin/vendors");
    revalidatePath("/vendors");
    if (pricingCooldownBlocked) {
      redirect(
        "/vendor/dashboard?edit=1&message=Your%20listing%20updates%20are%20now%20live.%20You%20can%20update%20pricing%20once%20every%2024%20hours.",
      );
    }
    redirect("/vendor/dashboard?edit=1&message=Your%20listing%20updates%20are%20now%20live");
  }

  if (
    !businessName ||
    !ownerName ||
    !effectiveEmail ||
    !resolvedCategory ||
    !countryRegion ||
    !location ||
    !phoneCode ||
    !normalizedPhoneLocal
  ) {
    redirect(
      "/vendor/dashboard?edit=1&error=Business%20name,%20owner%20name,%20email,%20phone,%20country%20or%20region,%20and%20location%20are%20required%20before%20saving.",
    );
  }

  if (!isValidEmail(effectiveEmail)) {
    redirect(
      "/vendor/dashboard?edit=1&error=Please%20enter%20a%20valid%20email%20address.",
    );
  }

  if (!isValidPhoneLocal(normalizedPhoneLocal)) {
    redirect(
      "/vendor/dashboard?edit=1&error=Please%20enter%20a%20valid%20phone%20number.",
    );
  }

  if (intent === "pending_review") {
    const requiredChecks = [
      primarySocialLink,
      description,
      servicesOffered.length ? "services" : "",
      governmentIdPath,
    ];

    if (requiredChecks.some((value) => !value) || portfolioImageUrls.length < 4) {
      redirect(
        "/vendor/dashboard?edit=1&error=Complete%20the%20required%20business%20details,%20upload%20your%20government-issued%20ID,%20and%20add%20at%20least%204%20portfolio%20images%20before%20submitting%20for%20review.",
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
      "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20account%20details%20right%20now.",
    );
  }

  const existingVendorLookup = await queryVendorForAction(admin, user.id, {
    select: "id,user_id,status,approved,verified,created_at",
    context: "draft_or_submit",
  });

  console.log("Vendor lookup for draft/submit", {
    intent,
    authUserId: user.id,
    filter: { user_id: user.id },
    returnedRowCount: Array.isArray(existingVendorLookup.data)
      ? existingVendorLookup.data.length
      : 0,
    error: existingVendorLookup.error
      ? serializeSupabaseError(existingVendorLookup.error)
      : null,
  });

  if (existingVendorLookup.error) {
    console.error("Vendor profile save failed while loading vendor record", {
      intent,
      userId: user.id,
      error: serializeSupabaseError(existingVendorLookup.error),
    });
    redirect(
      "/vendor/dashboard?edit=1&error=We%20could%20not%20load%20your%20business%20record%20right%20now.",
    );
  }

  const existingVendor = Array.isArray(existingVendorLookup.data)
    ? existingVendorLookup.data[0] ?? null
    : null;

  const existingVendorId =
    typeof (existingVendor as Record<string, unknown> | null)?.["id"] === "string"
      ? String((existingVendor as Record<string, unknown>)["id"])
      : null;
  let vendorId = existingVendorId;
  const slug = await resolveVendorSlug(admin, businessName, existingVendorId);

  if (!vendorId) {
    const basePayload = {
      user_id: user.id,
      slug,
      business_name: businessName,
      category: resolvedCategory || "Others",
      location: location || countryRegion || "Location pending",
    };

    let inserted:
      | {
          id: string;
        }
      | null = null;
    let insertError:
      | {
          code?: string | null;
          message?: string | null;
          details?: string | null;
          hint?: string | null;
        }
      | null = null;

    const upsertResult = await admin
      .from("vendors")
      .upsert(basePayload, {
        onConflict: "user_id",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();

    inserted = upsertResult.data;
    insertError = upsertResult.error;

    if (
      insertError &&
      (insertError.code === "42P10" ||
        (insertError.message ?? "")
          .toLowerCase()
          .includes("there is no unique or exclusion constraint"))
    ) {
      console.warn("Vendor upsert fallback to insert because unique constraint is missing", {
        userId: user.id,
        error: serializeSupabaseError(insertError),
      });
      const fallbackInsert = await admin
        .from("vendors")
        .insert(basePayload)
        .select("id")
        .single();
      inserted = fallbackInsert.data;
      insertError = fallbackInsert.error;
    }

    if (insertError || !inserted) {
      console.error("Vendor profile save failed while creating vendor record", {
        userId: user.id,
        slug,
        businessName,
        category: resolvedCategory || "Others",
        location: location || countryRegion || "Location pending",
        error: serializeSupabaseError(insertError ?? {}),
      });
      redirect(
        "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20business%20details%20right%20now.",
      );
    }

    vendorId = inserted.id;
  }

  const status = intent === "pending_review" ? "pending_review" : "draft";
  const existingStatus =
    existingVendor?.status === "approved" || existingVendor?.approved
      ? "approved"
      : existingVendor?.status ?? "draft";
  const approvedVendorIsEditing = existingStatus === "approved";

  const hasMajorChanges =
    approvedVendorIsEditing &&
    hasApprovedVendorMajorChanges((existingVendor as Record<string, unknown> | null), {
      businessName,
      ownerName,
      category: resolvedCategory,
      location,
      countryRegion,
      nigeriaState,
      phoneCode,
      fullPhone,
      contactEmail: effectiveEmail,
      governmentIdPath,
      cacCertificatePath,
    });

  const shouldSubmitIdentityReview =
    approvedVendorIsEditing && intent === "pending_review" && hasMajorChanges;
  const shouldPreserveRestrictedFields = approvedVendorIsEditing && hasMajorChanges;
  const shouldPublishDirectChanges = !approvedVendorIsEditing && intent !== "draft";

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
  const existingVendorRecord = existingVendor as Record<string, unknown> | null;
  const existingCurrencyCode = normalizeCurrencyCode(
    existingVendorRecord?.["currency_code"],
    existingVendorRecord?.["price_currency"],
  );
  const existingStartingPrice = readNumericValue(
    existingVendorRecord?.["starting_price"],
    existingVendorRecord?.["price_amount"],
  );
  const existingPriceLastUpdatedAt = readIsoTimestamp(
    existingVendorRecord?.["price_last_updated_at"],
  );
  const nextStartingPrice = Number.isFinite(numericPrice) ? numericPrice : null;
  const priceChanged = Boolean(existingVendor?.id) && (
    existingCurrencyCode !== priceCurrency || !areNumbersEqual(existingStartingPrice, nextStartingPrice)
  );
  if (priceChanged) {
    const lastUpdatedMs = toMs(existingPriceLastUpdatedAt);
    const nowMs = Date.now();
    const cooldownMs = 24 * 60 * 60 * 1000;
    if (lastUpdatedMs && nowMs - lastUpdatedMs < cooldownMs) {
      redirect(
        "/vendor/dashboard?edit=1&error=You%20can%20update%20your%20pricing%20once%20every%2024%20hours.%20Please%20try%20again%20later.",
      );
    }
  }
  const nextPriceLastUpdatedAt = priceChanged
    ? new Date().toISOString()
    : existingPriceLastUpdatedAt;
  const restrictedFieldFallback = {
    business_name:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "business_name")) || businessName
        : businessName,
    owner_name:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "owner_name")) || ownerName || null
        : ownerName || null,
    category:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "category")) || (resolvedCategory || "Others")
        : resolvedCategory || "Others",
    country_region:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "country_region")) || null
        : countryRegion || null,
    nigeria_state:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "nigeria_state")) || null
        : countryRegion === "Nigeria"
          ? nigeriaState || null
          : null,
    phone_code:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "phone_code")) || null
        : phoneCode || null,
    location:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "location")) || (location || countryRegion || "Location pending")
        : location || countryRegion || "Location pending",
    whatsapp:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "whatsapp")) || null
        : fullPhone || null,
    contact_email:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "contact_email")) || (user.email ?? null)
        : effectiveEmail || null,
    government_id_url:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "government_id_url")) || null
        : governmentIdPath || null,
    cac_certificate_url:
      shouldPreserveRestrictedFields
        ? normalizeString(readStringField(existingVendorRecord, "cac_certificate_url")) || null
        : registeredBusiness
          ? cacCertificatePath || null
          : null,
  };

  const existingAdminNotes = normalizeString(
    readStringField(existingVendorRecord, "admin_notes"),
  );
  const nextAdminNotes =
    shouldSubmitIdentityReview
      ? appendIdentityReviewNote(existingAdminNotes, {
          businessName,
          ownerName,
          category: resolvedCategory,
          countryRegion,
          nigeriaState,
          phoneCode,
          fullPhone,
          location,
          contactEmail: effectiveEmail,
          governmentIdPath,
          cacCertificatePath: registeredBusiness ? cacCertificatePath : "",
        })
      : existingAdminNotes || null;

  const vendorPayload = {
    slug,
    business_name: restrictedFieldFallback.business_name,
    owner_name: restrictedFieldFallback.owner_name,
    category: restrictedFieldFallback.category,
    custom_category: isOthersCategory
      ? customCategory || null
      : subcategory || null,
    registered_business:
      shouldPreserveRestrictedFields
        ? Boolean((existingVendor as Record<string, unknown> | null)?.["registered_business"])
        : registeredBusiness,
    country_region: restrictedFieldFallback.country_region,
    nigeria_state: restrictedFieldFallback.nigeria_state,
    phone_code: restrictedFieldFallback.phone_code,
    culture: cultureSpecialization || null,
    culture_specialization: cultureSpecialization || null,
    location: restrictedFieldFallback.location,
    years_experience: yearsExperience || null,
    primary_social_link: primarySocialLink || null,
    contact_email: restrictedFieldFallback.contact_email,
    instagram: primarySocialLink || null,
    website: website || null,
    whatsapp: restrictedFieldFallback.whatsapp,
    description: description || null,
    services_offered: servicesOffered,
    price_currency: priceCurrency || null,
    price_amount: numericPrice,
    price_range: formattedPrice,
    currency_code: priceCurrency,
    starting_price: numericPrice,
    price_label: formattedPrice,
    price_last_updated_at: nextPriceLastUpdatedAt,
    portfolio_image_urls: portfolioImageUrls,
    government_id_url: restrictedFieldFallback.government_id_url,
    cac_certificate_url: restrictedFieldFallback.cac_certificate_url,
    admin_notes: nextAdminNotes,
    status: nextStatus,
    profile_status: nextStatus,
    onboarding_completed: nextOnboardingCompleted,
    availability_status: nextAvailabilityStatus,
    value_statement:
      description || "Vendor profile details saved for marketplace review.",
    approved: nextApproved,
    verified: nextVerified,
  };

  let error: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  } | null = null;

  if (shouldPublishDirectChanges) {
    console.log("VENDOR_UPDATE_DIRECT_FIELDS_RUNNING", {
      vendorId,
      intent,
      approvedVendorIsEditing,
      priceChanged,
    });
    console.log("Vendor profile write attempt", {
      table: "vendors",
      authUserId: user.id,
      vendorId,
      intent,
      payload: vendorPayload,
    });

    const result = await admin
      .from("vendors")
      .update(vendorPayload)
      .eq("id", vendorId);
    error = result.error;
  }

  if (shouldPublishDirectChanges && error && isSchemaDriftError(error)) {
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
      price_last_updated_at: vendorPayload.price_last_updated_at,
      portfolio_image_urls: vendorPayload.portfolio_image_urls,
      government_id_url: vendorPayload.government_id_url,
      admin_notes: vendorPayload.admin_notes,
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

  if (shouldPublishDirectChanges && error && isSchemaDriftError(error)) {
    const minimalPayload = {
      slug: vendorPayload.slug,
      business_name: vendorPayload.business_name,
      category: vendorPayload.category,
      location: vendorPayload.location,
      whatsapp: vendorPayload.whatsapp,
      description: vendorPayload.description,
      services_offered: vendorPayload.services_offered,
      price_currency: vendorPayload.price_currency,
      price_amount: vendorPayload.price_amount,
      price_range: vendorPayload.price_range,
      price_last_updated_at: vendorPayload.price_last_updated_at,
      admin_notes: vendorPayload.admin_notes,
      status: vendorPayload.status,
      profile_status: vendorPayload.profile_status,
      onboarding_completed: vendorPayload.onboarding_completed,
      approved: vendorPayload.approved,
      verified: vendorPayload.verified,
    };

    console.warn("Vendor profile write retrying with minimal payload", {
      table: "vendors",
      authUserId: user.id,
      vendorId,
      error: serializeSupabaseError(error),
      payload: minimalPayload,
    });

    const minimalResult = await admin
      .from("vendors")
      .update(minimalPayload)
      .eq("id", vendorId);
    error = minimalResult.error;
  }

  if (shouldPublishDirectChanges && error) {
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
      "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20vendor%20profile%20right%20now.",
    );
  }

  const draftPayload = {
    business_name: businessName,
    owner_name: ownerName,
    email: effectiveEmail,
    phone_code: phoneCode,
    phone_local: normalizedPhoneLocal,
    full_phone: fullPhone,
    category: resolvedCategory,
    subcategory,
    custom_category: customCategory,
    country_region: countryRegion,
    nigeria_state: nigeriaState,
    region_label: regionLabel,
    location,
    years_experience: yearsExperience,
    currency_code: priceCurrency,
    starting_price: nextStartingPrice,
    primary_social_link: primarySocialLink,
    website,
    culture_specialization: cultureSpecialization,
    description,
    services_offered: servicesOffered,
    portfolio_image_urls: portfolioImageUrls,
    government_id_url: governmentIdPath,
    cac_certificate_url: registeredBusiness ? cacCertificatePath : null,
    registered_business: registeredBusiness,
    updated_at: new Date().toISOString(),
  };

  const draftResult = await admin.from("vendor_profile_drafts").upsert(
    {
      vendor_id: vendorId,
      user_id: user.id,
      draft_data: draftPayload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "vendor_id,user_id", ignoreDuplicates: false },
  );

  if (draftResult.error && isSchemaDriftError(draftResult.error)) {
    console.warn("Vendor draft table not available yet", {
      vendorId,
      userId: user.id,
      error: serializeSupabaseError(draftResult.error),
    });
  } else if (draftResult.error) {
    console.error("Vendor draft save failed", {
      vendorId,
      userId: user.id,
      error: serializeSupabaseError(draftResult.error),
    });
    redirect(
      "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20draft%20right%20now.",
    );
  }

  if (shouldSubmitIdentityReview) {
    console.log("VENDOR_CHANGE_REQUEST_RUNNING", {
      vendorId,
      intent,
      approvedVendorIsEditing,
    });
    const changeRequestPayload = {
      business_name: businessName,
      owner_name: ownerName,
      email: effectiveEmail,
      phone_code: phoneCode,
      phone_local: normalizedPhoneLocal,
      full_phone: fullPhone,
      country_region: countryRegion,
      nigeria_state: nigeriaState,
      location,
      government_id_url: governmentIdPath,
      cac_certificate_url: registeredBusiness ? cacCertificatePath : null,
      registered_business: registeredBusiness,
    };

    const changeRequestResult = await admin.from("vendor_change_requests").insert({
      vendor_id: vendorId,
      user_id: user.id,
      requested_changes: changeRequestPayload,
      status: "pending",
    });

    if (changeRequestResult.error && isSchemaDriftError(changeRequestResult.error)) {
      console.warn("Vendor change request table not available yet", {
        vendorId,
        userId: user.id,
        error: serializeSupabaseError(changeRequestResult.error),
      });
    } else if (changeRequestResult.error) {
      console.error("Vendor change request insert failed", {
        vendorId,
        userId: user.id,
        error: serializeSupabaseError(changeRequestResult.error),
      });
      redirect(
        "/vendor/dashboard?edit=1&error=We%20could%20not%20submit%20your%20identity%20changes%20for%20review%20right%20now.",
      );
    }
  }

  if (shouldPublishDirectChanges && priceChanged) {
    const historyPayload = {
      vendor_id: vendorId,
      changed_by: user.id,
      old_currency_code: existingCurrencyCode,
      old_starting_price:
        existingStartingPrice === null ? null : String(existingStartingPrice),
      new_currency_code: priceCurrency,
      new_starting_price:
        nextStartingPrice === null ? null : String(nextStartingPrice),
    };
    const historyResult = await admin.from("vendor_price_history").insert(historyPayload);
    if (historyResult.error && isSchemaDriftError(historyResult.error)) {
      console.warn("Vendor price history table not available yet", {
        vendorId,
        userId: user.id,
        payload: historyPayload,
        error: serializeSupabaseError(historyResult.error),
      });
    } else if (historyResult.error) {
      console.error("Vendor price history insert failed", {
        vendorId,
        userId: user.id,
        payload: historyPayload,
        error: serializeSupabaseError(historyResult.error),
      });
    }
  }

  if (shouldPublishDirectChanges) {
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
        "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20portfolio%20images%20right%20now.",
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
          "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20portfolio%20images%20right%20now.",
        );
      }
    }
  }

  revalidatePath("/vendor/dashboard");
  revalidatePath("/admin/vendors");
  revalidatePath("/vendors");

  if (intent === "draft") {
    redirect(
      "/vendor/dashboard?edit=1&message=Draft%20saved.%20You%20can%20continue%20editing%20later.",
    );
  }

  if (approvedVendorIsEditing && shouldSubmitIdentityReview) {
    redirect(
      "/vendor/dashboard?edit=1&message=Your%20business%20identity%20changes%20have%20been%20sent%20to%20admin%20for%20review.%20You%20will%20receive%20a%20response%20within%203%20business%20days.",
    );
  }

  if (approvedVendorIsEditing) {
    redirect(
      "/vendor/dashboard?edit=1&message=Your%20changes%20have%20been%20saved%20and%20your%20listing%20remains%20live.",
    );
  }

  redirect("/vendor/dashboard?edit=1&message=Your%20profile%20has%20been%20submitted%20for%20review.");
}

async function queryVendorForAction(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  options: {
    select: string;
    context: "publish" | "draft_or_submit";
  },
) {
  const ordered = (await admin
    .from("vendors")
    .select(options.select)
    .eq("user_id", userId)
    .order("approved", { ascending: false })
    .order("created_at", { ascending: false })) as unknown as {
    data: Array<Record<string, unknown>> | null;
    error: {
      code?: string | null;
      message?: string | null;
      details?: string | null;
      hint?: string | null;
    } | null;
  };

  if (!ordered.error) {
    return ordered;
  }

  console.warn("Vendor lookup ordered query failed; retrying without ordering", {
    context: options.context,
    authUserId: userId,
    error: serializeSupabaseError(ordered.error),
  });

  const unordered = (await admin
    .from("vendors")
    .select(options.select)
    .eq("user_id", userId)) as unknown as {
    data: Array<Record<string, unknown>> | null;
    error: {
      code?: string | null;
      message?: string | null;
      details?: string | null;
      hint?: string | null;
    } | null;
  };

  if (!unordered.error) {
    const rows = Array.isArray(unordered.data) ? unordered.data : [];
    rows.sort((a, b) => {
      const aApproved = a.approved === true ? 1 : 0;
      const bApproved = b.approved === true ? 1 : 0;
      if (aApproved !== bApproved) {
        return bApproved - aApproved;
      }
      const aCreated = Date.parse(String(a.created_at ?? "")) || 0;
      const bCreated = Date.parse(String(b.created_at ?? "")) || 0;
      return bCreated - aCreated;
    });
    return { data: rows, error: null };
  }

  return unordered;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhoneLocal(value: string) {
  return /^[0-9]{6,15}$/.test(value);
}

async function queryLatestVendorForUser(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  select: string,
) {
  console.log("[vendor-read] queryLatestVendorForUser:start", {
    authUserId: userId,
    table: "vendors",
    filter: { user_id: userId },
    orderBy: "created_at desc",
  });

  const withCreatedAt = (await admin
    .from("vendors")
    .select(select)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)) as unknown as {
    data: Array<Record<string, unknown>> | null;
    error: {
      code?: string | null;
      message?: string | null;
      details?: string | null;
      hint?: string | null;
    } | null;
  };

  console.log("[vendor-read] queryLatestVendorForUser:created_at", {
    authUserId: userId,
    filter: { user_id: userId },
    returnedRowCount: Array.isArray(withCreatedAt.data)
      ? withCreatedAt.data.length
      : 0,
    error: withCreatedAt.error
      ? serializeSupabaseError(withCreatedAt.error)
      : null,
  });

  if (!withCreatedAt.error || !isSchemaDriftError(withCreatedAt.error)) {
    return withCreatedAt;
  }

  const unordered = (await admin
    .from("vendors")
    .select(select)
    .eq("user_id", userId)
    .limit(1)) as unknown as {
    data: Array<Record<string, unknown>> | null;
    error: {
      code?: string | null;
      message?: string | null;
      details?: string | null;
      hint?: string | null;
    } | null;
  };

  console.log("[vendor-read] queryLatestVendorForUser:unordered", {
    authUserId: userId,
    filter: { user_id: userId },
    returnedRowCount: Array.isArray(unordered.data) ? unordered.data.length : 0,
    error: unordered.error ? serializeSupabaseError(unordered.error) : null,
  });

  return unordered;
}

function normalizePhoneLocal(value: string) {
  return value.replace(/\D/g, "");
}

function normalizePhoneCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "+";
  }
  return trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/\D/g, "")}`;
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

function isRlsDeniedError(error: {
  code?: string | null;
  message?: string | null;
}) {
  return error.code === "42501";
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

function readStringField(
  record: Record<string, unknown> | null,
  key: string,
) {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

function readIsoTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function toMs(value: string | null) {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function appendIdentityReviewNote(
  existingNotes: string,
  values: {
    businessName: string;
    ownerName: string;
    category: string;
    countryRegion: string;
    nigeriaState: string;
    phoneCode: string;
    fullPhone: string;
    location: string;
    contactEmail: string;
    governmentIdPath: string;
    cacCertificatePath: string;
  },
) {
  const submittedAt = new Date().toISOString();
  const note = [
    `[Identity review request] ${submittedAt}`,
    `business_name=${values.businessName}`,
    `owner_name=${values.ownerName}`,
    `category=${values.category}`,
    `country_region=${values.countryRegion}`,
    `nigeria_state=${values.nigeriaState}`,
    `phone_code=${values.phoneCode}`,
    `whatsapp=${values.fullPhone}`,
    `location=${values.location}`,
    `contact_email=${values.contactEmail}`,
    `government_id_url=${values.governmentIdPath}`,
    `cac_certificate_url=${values.cacCertificatePath}`,
  ].join(" | ");

  const combined = existingNotes ? `${existingNotes}\n${note}` : note;
  return combined.slice(0, 8000);
}

function normalizeCurrencyCode(
  primary: unknown,
  fallback?: unknown,
) {
  const first =
    typeof primary === "string" && primary.trim()
      ? primary.trim().toUpperCase()
      : null;
  if (first) {
    return first;
  }
  const second =
    typeof fallback === "string" && fallback.trim()
      ? fallback.trim().toUpperCase()
      : null;
  return second ?? "NGN";
}

function readNumericValue(primary: unknown, fallback?: unknown) {
  const primaryNumber =
    typeof primary === "number"
      ? primary
      : typeof primary === "string" && primary.trim()
        ? Number(primary)
        : null;
  if (Number.isFinite(primaryNumber)) {
    return primaryNumber as number;
  }

  const fallbackNumber =
    typeof fallback === "number"
      ? fallback
      : typeof fallback === "string" && fallback.trim()
        ? Number(fallback)
        : null;
  if (Number.isFinite(fallbackNumber)) {
    return fallbackNumber as number;
  }

  return null;
}

function areNumbersEqual(left: number | null, right: number | null) {
  if (left === null && right === null) {
    return true;
  }
  if (left === null || right === null) {
    return false;
  }
  return Math.abs(left - right) < 0.0000001;
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
