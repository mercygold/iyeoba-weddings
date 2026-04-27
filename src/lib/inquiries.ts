import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { normalizeVendorCategory } from "@/lib/vendor-categories";
import { getVendorDirectory } from "@/lib/vendors";
import { getVendorPlaceholderImage } from "@/lib/vendor-placeholders";
import { unstable_noStore as noStore } from "next/cache";

export type InquiryMessage = {
  id: string;
  senderRole: "planner" | "vendor" | "admin";
  senderLabel: string;
  body: string;
  createdAt: string | null;
};

export type PlannerSavedVendor = {
  id: string;
  createdAt: string;
  vendor: {
    id: string;
    slug: string;
    businessName: string;
    category: string;
    location: string;
    priceRange?: string | null;
    whatsapp: string | null;
    contactEmail: string | null;
    imageUrl: string;
  };
};

export type PlannerInquiry = {
  id: string;
  createdAt: string;
  threadStatus: "open" | "contacted" | "closed" | "archived";
  contactMethod: string | null;
  vendor: {
    id: string;
    slug: string;
    businessName: string;
    category: string;
    location: string;
    whatsapp: string | null;
    contactEmail: string | null;
    imageUrl: string;
  };
  messages: InquiryMessage[];
};

export type VendorInquiry = {
  id: string;
  createdAt: string;
  threadStatus: "open" | "contacted" | "closed" | "archived";
  contactMethod: string | null;
  plannerName: string | null;
  plannerEmail: string | null;
  plannerPhone: string | null;
  weddingSummary: string | null;
  messages: InquiryMessage[];
};

type LeadRow = {
  id: string;
  created_at?: string | null;
  user_id?: string | null;
  planner_user_id?: string | null;
  vendor_user_id?: string | null;
  vendor_id?: string | null;
  wedding_id?: string | null;
  message?: string | null;
  status?: string | null;
  contacted_at?: string | null;
  archived_at?: string | null;
  updated_at?: string | null;
  planner_display_name?: string | null;
  vendor_business_name?: string | null;
  users?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  }[] | null;
  weddings?: {
    culture?: string | null;
    wedding_type?: string | null;
    location?: string | null;
  } | {
    culture?: string | null;
    wedding_type?: string | null;
    location?: string | null;
  }[] | null;
};

type LeadMessageRow = {
  id: string;
  lead_id: string;
  sender_user_id?: string | null;
  body?: string | null;
  message?: string | null;
  created_at?: string | null;
};

export async function getPlannerSavedVendors(userId: string) {
  noStore();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  let { data, error } = await supabase
    .from("saved_vendors")
    .select(
      `
        id,
        created_at,
        vendor_id
      `,
    )
    .or(`user_id.eq.${userId},planner_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error && isSchemaDriftError(error)) {
    const fallbackResult = await supabase
      .from("saved_vendors")
      .select(
        `
          id,
          created_at,
          vendor_id
        `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error || !data) {
    console.error("Planner saved vendors query failed", {
      table: "saved_vendors",
      userId,
      error: error ? serializeSupabaseError(error) : null,
    });
    return [] as PlannerSavedVendor[];
  }

  const savedVendorIds = data.map((row) => row.vendor_id).filter(Boolean);
  const vendorMap = new Map<
    string,
    {
      id: string;
      slug: string;
      business_name: string;
      category: string;
      custom_category?: string | null;
      location: string;
      whatsapp?: string | null;
      price_range?: string | null;
      portfolio_image_urls?: string[] | null;
      vendor_portfolio?: { image_url: string; sort_order: number | null }[] | null;
    }
  >();

  if (savedVendorIds.length) {
    const vendorSelect = `
      id,
      slug,
      business_name,
      category,
      custom_category,
      location,
      whatsapp,
      price_range,
      portfolio_image_urls,
      vendor_portfolio(image_url, sort_order)
    `;

    const vendorClient = admin ?? supabase;
    const vendorResult = await vendorClient
      .from("vendors")
      .select(vendorSelect)
      .in("id", savedVendorIds);

    console.log("Planner saved vendors vendor lookup", {
      table: "vendors",
      plannerUserId: userId,
      savedVendorIds,
      count: vendorResult.data?.length ?? 0,
      error: vendorResult.error ? serializeSupabaseError(vendorResult.error) : null,
      client: admin ? "service_role" : "authenticated_server",
    });

    if (!vendorResult.error && vendorResult.data) {
      for (const vendor of vendorResult.data) {
        vendorMap.set(vendor.id, vendor);
      }
    }
  }

  const publicDirectory = await getVendorDirectory();
  const publicDirectoryMap = new Map(
    publicDirectory
      .filter((vendor) => vendor.id)
      .map((vendor) => [vendor.id as string, vendor]),
  );

  const results = data
    .map((row) => {
      const vendor = vendorMap.get(row.vendor_id);
      const directoryVendor = publicDirectoryMap.get(row.vendor_id);

      let normalizedCategory = normalizeVendorCategory("Others", null);
      let imageUrl = getVendorPlaceholderImage("Beauty");
      let slug = `saved-${row.vendor_id}`;
      let businessName = "Saved vendor";
      let category = "Others";
      let location = "Location unavailable";
      let priceRange: string | null = null;
      let whatsapp: string | null = null;

      if (vendor) {
        normalizedCategory = normalizeVendorCategory(
          vendor.category,
          vendor.custom_category ?? null,
        );
        const portfolioImages =
          vendor.vendor_portfolio
            ?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((entry) => entry.image_url)
            .filter(Boolean) ?? [];
        imageUrl =
          portfolioImages[0] ??
          vendor.portfolio_image_urls?.[0] ??
          getVendorPlaceholderImage(normalizedCategory.category ?? "Beauty");
        slug = vendor.slug;
        businessName = vendor.business_name;
        category = normalizedCategory.category;
        location = vendor.location;
        priceRange = vendor.price_range ?? null;
        whatsapp = vendor.whatsapp ?? null;
      } else if (directoryVendor) {
        normalizedCategory = normalizeVendorCategory(
          directoryVendor.category,
          directoryVendor.customCategory ?? null,
        );
        imageUrl = directoryVendor.imageUrl;
        slug = directoryVendor.slug;
        businessName = directoryVendor.businessName;
        category = normalizedCategory.category;
        location = directoryVendor.location;
        priceRange = directoryVendor.priceRange ?? null;
        whatsapp = directoryVendor.whatsapp ?? null;
      }

      return {
        id: row.id,
        createdAt: row.created_at,
        vendor: {
          id: row.vendor_id,
          slug,
          businessName,
          category,
          location,
          priceRange,
          whatsapp,
          contactEmail: null,
          imageUrl,
        },
      } satisfies PlannerSavedVendor;
    })
    .filter(Boolean) as PlannerSavedVendor[];

  console.log("Planner saved vendors query", {
    userId,
    savedVendorIds,
    savedVendorRows: data.map((row) => ({ id: row.id, vendor_id: row.vendor_id })),
    returnedVendorIds: results.map((row) => row.vendor.id),
  });

  return results;
}

export async function getPlannerInquiries(userId: string) {
  noStore();
  const supabase = await createSupabaseServerClient();
  const dbConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!dbConfigured) {
    return [] as PlannerInquiry[];
  }

  const leadSelect = `
    id,
    created_at,
    user_id,
    planner_user_id,
    vendor_id,
    wedding_id,
    message,
    status,
    contacted_at,
    archived_at,
    updated_at
  `;

  const plannerResult = await supabase
    .from("leads")
    .select(leadSelect)
    .eq("planner_user_id", userId)
    .order("created_at", { ascending: false });

  console.log("Planner inquiries primary query", {
    table: "leads",
    userId,
    filter: "planner_user_id",
    select: leadSelect,
    count: plannerResult.data?.length ?? 0,
    leadRows:
      (plannerResult.data ?? []).map((row) => ({
        id: row.id,
        vendor_id: row.vendor_id,
        planner_user_id: row.planner_user_id,
        user_id: row.user_id,
      })) ?? [],
    error: plannerResult.error ? serializeSupabaseError(plannerResult.error) : null,
  });

  const legacyResult = await supabase
    .from("leads")
    .select(leadSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (legacyResult.error || (legacyResult.data && legacyResult.data.length)) {
    console.log("Planner inquiries legacy query", {
      table: "leads",
      userId,
      filter: "user_id",
      select: leadSelect,
      count: legacyResult.data?.length ?? 0,
      leadRows:
        (legacyResult.data ?? []).map((row) => ({
          id: row.id,
          vendor_id: row.vendor_id,
          planner_user_id: row.planner_user_id,
          user_id: row.user_id,
        })) ?? [],
      error: legacyResult.error ? serializeSupabaseError(legacyResult.error) : null,
    });
  }

  const primaryRows = (plannerResult.data ?? []) as LeadRow[];
  const legacyRows = (legacyResult.data ?? []) as LeadRow[];
  const rows = [...primaryRows, ...legacyRows].filter(
    (row, index, array) => array.findIndex((item) => item.id === row.id) === index,
  );

  if (plannerResult.error && legacyResult.error) {
    console.error("Planner inquiries query failed", {
      table: "leads",
      userId,
      primaryError: serializeSupabaseError(plannerResult.error),
      fallbackError: serializeSupabaseError(legacyResult.error),
      select: leadSelect,
    });
    return [] as PlannerInquiry[];
  }

  if (!rows.length) {
    return [] as PlannerInquiry[];
  }

  const vendorIds = rows.map((row) => row.vendor_id).filter(Boolean) as string[];
  const vendorLookup = await getPlannerInquiryVendorMap(vendorIds);
  const plannerLabel = await getPlannerDisplayLabel(userId);
  const directoryVendors = await getVendorDirectory();
  const directoryVendorMap = new Map(
    directoryVendors
      .filter((vendor) => vendor.id)
      .map((vendor) => [vendor.id as string, vendor]),
  );
  const rowsWithParticipants = rows.map((row) => ({
    ...row,
    vendor_user_id:
      row.vendor_user_id ?? vendorLookup.get(row.vendor_id ?? "")?.user_id ?? null,
    planner_display_name: plannerLabel,
    vendor_business_name:
      vendorLookup.get(row.vendor_id ?? "")?.business_name ??
      directoryVendorMap.get(row.vendor_id ?? "")?.businessName ??
      "Vendor",
  }));
  const messagesByLead = await getLeadMessagesMap(
    rowsWithParticipants.map((row) => row.id),
    rowsWithParticipants,
  );

  const groupedByVendor = new Map<string, LeadRow[]>();
  for (const row of rowsWithParticipants) {
    const vendorId =
      row.vendor_id ??
      vendorLookup.get(row.vendor_id ?? "")?.id ??
      "unknown-vendor";
    const current = groupedByVendor.get(vendorId) ?? [];
    current.push(row);
    groupedByVendor.set(vendorId, current);
  }

  const inquiries = [...groupedByVendor.entries()]
    .map(([vendorId, leadGroup]) => {
      const primaryLead = pickPrimaryLeadForThread(leadGroup);
      const vendor = vendorLookup.get(vendorId ?? "");
      const directoryVendor = directoryVendorMap.get(vendorId ?? "");
      const normalizedCategory = normalizeVendorCategory(
        vendor?.category ?? directoryVendor?.category ?? "Others",
        vendor?.custom_category ?? directoryVendor?.customCategory ?? null,
      );
      const sortedPortfolioImages = [...(vendor?.vendor_portfolio ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((entry) => entry.image_url)
        .filter(Boolean);
      const vendorPrimaryImage =
        sortedPortfolioImages[0] ??
        vendor?.portfolio_image_urls?.[0] ??
        directoryVendor?.imageUrl ??
        getVendorPlaceholderImage(normalizedCategory.category ?? "Beauty");

      const threadMessages = buildMergedThreadMessages(
        leadGroup,
        plannerLabel,
        messagesByLead,
      );

      console.log("Planner thread assembly", {
        vendorId,
        chosenLeadId: primaryLead.id,
        mergedLeadIds: leadGroup.map((lead) => lead.id),
        hasInitialMessage: leadGroup.some((lead) => Boolean(lead.message?.trim())),
        leadMessagesCount: leadGroup.reduce(
          (count, lead) => count + (messagesByLead.get(lead.id)?.length ?? 0),
          0,
        ),
        finalThreadCount: threadMessages.length,
      });

      return {
        id: primaryLead.id,
        createdAt: toValidTimestamp(primaryLead.created_at) ?? new Date().toISOString(),
        threadStatus: primaryLead.archived_at
          ? "archived"
          : normalizeThreadStatus(null, primaryLead.status),
        contactMethod: null,
        vendor: {
          id:
            vendor?.id ??
            directoryVendor?.id ??
            primaryLead.vendor_id ??
            "unknown-vendor",
          slug: vendor?.slug ?? directoryVendor?.slug ?? "vendors",
          businessName:
            vendor?.business_name ??
            directoryVendor?.businessName ??
            "Vendor",
          category: normalizedCategory.category,
          location: vendor?.location ?? directoryVendor?.location ?? "Location unavailable",
          whatsapp: vendor?.whatsapp ?? directoryVendor?.whatsapp ?? null,
          contactEmail: directoryVendor?.contactEmail ?? null,
          imageUrl: vendorPrimaryImage,
        },
        messages: threadMessages,
      } satisfies PlannerInquiry;
    })
    .filter(Boolean) as PlannerInquiry[];

  console.log("Planner inquiry thread merge result", {
    userId,
    leadIds: rows.map((row) => row.id),
    visibleThreadCount: inquiries.length,
    threadMessageCounts: inquiries.map((inquiry) => ({
      leadId: inquiry.id,
      count: inquiry.messages.length,
    })),
  });

  return inquiries;
}

async function getPlannerInquiryVendorMap(vendorIds: string[]) {
  const uniqueVendorIds = [...new Set(vendorIds.filter(Boolean))];
  const map = new Map<
    string,
    {
      id: string;
      user_id?: string | null;
      slug: string;
      business_name: string;
      category: string;
      custom_category?: string | null;
      location: string;
      whatsapp?: string | null;
      portfolio_image_urls?: string[] | null;
      vendor_portfolio?: { image_url: string; sort_order: number | null }[] | null;
    }
  >();

  if (!uniqueVendorIds.length) {
    return map;
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const vendorSelect = `
    id,
    user_id,
    slug,
    business_name,
    category,
    custom_category,
    location,
    whatsapp,
    portfolio_image_urls,
    vendor_portfolio(image_url, sort_order)
  `;

  const client = admin ?? supabase;
  let { data, error } = await client
    .from("vendors")
    .select(vendorSelect)
    .in("id", uniqueVendorIds);

  if (error && isSchemaDriftError(error)) {
    const fallbackSelect = `
      id,
      user_id,
      slug,
      business_name,
      category,
      custom_category,
      location,
      whatsapp,
      portfolio_image_urls
    `;
    const fallback = await client
      .from("vendors")
      .select(fallbackSelect)
      .in("id", uniqueVendorIds);
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  console.log("Planner inquiry vendor lookup", {
    table: "vendors",
    vendorIds: uniqueVendorIds,
    select: vendorSelect,
    count: data?.length ?? 0,
    error: error ? serializeSupabaseError(error) : null,
  });

  if (error || !data) {
    return map;
  }

  for (const vendor of data) {
    map.set(vendor.id, vendor);
  }

  return map;
}

export async function getVendorInquiries(userId: string) {
  const supabase = await createSupabaseServerClient();
  const dbConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!dbConfigured) {
    return [] as VendorInquiry[];
  }

  const vendorSelect = "id, user_id, business_name, slug, category, location, whatsapp";
  const vendorResult = await supabase
    .from("vendors")
    .select(vendorSelect)
    .eq("user_id", userId);

  console.log("Vendor inquiry vendor lookup", {
    table: "vendors",
    userId,
    select: vendorSelect,
    count: vendorResult.data?.length ?? 0,
    error: vendorResult.error ? serializeSupabaseError(vendorResult.error) : null,
  });

  if (vendorResult.error || !vendorResult.data) {
    console.error("Vendor inquiries query failed while loading vendor records", {
      table: "vendors",
      userId,
      select: vendorSelect,
      error: vendorResult.error ? serializeSupabaseError(vendorResult.error) : null,
    });
    return [] as VendorInquiry[];
  }

  const vendorIds = vendorResult.data.map((vendor) => vendor.id).filter(Boolean);
  if (!vendorIds.length) {
    return [] as VendorInquiry[];
  }

  const leadSelect = `
    id,
    created_at,
    user_id,
    planner_user_id,
    vendor_id,
    wedding_id,
    message,
    status,
    contacted_at,
    archived_at,
    updated_at
  `;

  const leadResult = await supabase
    .from("leads")
    .select(leadSelect)
    .in("vendor_id", vendorIds)
    .order("created_at", { ascending: false });

  console.log("Vendor inquiries lead query", {
    table: "leads",
    userId,
    vendorIds,
    select: leadSelect,
    count: leadResult.data?.length ?? 0,
    error: leadResult.error ? serializeSupabaseError(leadResult.error) : null,
  });

  if (leadResult.error || !leadResult.data) {
    console.error("Vendor inquiries query failed", {
      table: "leads",
      userId,
      vendorIds,
      select: leadSelect,
      error: leadResult.error ? serializeSupabaseError(leadResult.error) : null,
    });
    return [] as VendorInquiry[];
  }

  const rows = leadResult.data as LeadRow[];
  if (!rows.length) {
    return [] as VendorInquiry[];
  }

  const plannerIds = rows
    .map((row) => row.planner_user_id ?? row.user_id)
    .filter(Boolean) as string[];
  const uniquePlannerIds = [...new Set(plannerIds)];
  const weddingIds = rows.map((row) => row.wedding_id).filter(Boolean) as string[];
  const uniqueWeddingIds = [...new Set(weddingIds)];

  const plannerLookup = new Map<
    string,
    { full_name?: string | null; email?: string | null; phone?: string | null }
  >();
  const weddingLookup = new Map<
    string,
    { culture?: string | null; wedding_type?: string | null; location?: string | null }
  >();

  if (uniquePlannerIds.length) {
    const plannerResult = await supabase
      .from("users")
      .select("id, full_name, email, phone")
      .in("id", uniquePlannerIds);

    console.log("Vendor inquiries planner lookup", {
      table: "users",
      userId,
      plannerIds: uniquePlannerIds,
      count: plannerResult.data?.length ?? 0,
      error: plannerResult.error ? serializeSupabaseError(plannerResult.error) : null,
    });

    if (!plannerResult.error && plannerResult.data) {
      for (const planner of plannerResult.data) {
        plannerLookup.set(planner.id, planner);
      }
    }
  }

  if (uniqueWeddingIds.length) {
    const weddingResult = await supabase
      .from("weddings")
      .select("id, culture, wedding_type, location")
      .in("id", uniqueWeddingIds);

    console.log("Vendor inquiries wedding lookup", {
      table: "weddings",
      userId,
      weddingIds: uniqueWeddingIds,
      count: weddingResult.data?.length ?? 0,
      error: weddingResult.error ? serializeSupabaseError(weddingResult.error) : null,
    });

    if (!weddingResult.error && weddingResult.data) {
      for (const wedding of weddingResult.data) {
        weddingLookup.set(wedding.id, wedding);
      }
    }
  }

  const vendorOwnerById = new Map(vendorResult.data.map((vendor) => [vendor.id, vendor.user_id]));
  const rowsWithParticipants = rows.map((row) => ({
    ...row,
    vendor_user_id:
      row.vendor_user_id ?? vendorOwnerById.get(row.vendor_id ?? "") ?? null,
    planner_display_name: buildPlannerDisplayName(
      plannerLookup.get(row.planner_user_id ?? row.user_id ?? ""),
    ),
    vendor_business_name:
      vendorResult.data.find((vendor) => vendor.id === row.vendor_id)?.business_name ??
      "Vendor",
  }));
  const messagesByLead = await getLeadMessagesMap(
    rowsWithParticipants.map((row) => row.id),
    rowsWithParticipants,
  );
  const groupedByPlannerVendor = new Map<string, LeadRow[]>();
  for (const row of rowsWithParticipants) {
    const plannerId = row.planner_user_id ?? row.user_id ?? "unknown-planner";
    const key = `${plannerId}::${row.vendor_id ?? "unknown-vendor"}`;
    const current = groupedByPlannerVendor.get(key) ?? [];
    current.push(row);
    groupedByPlannerVendor.set(key, current);
  }

  const inquiries = [...groupedByPlannerVendor.entries()].map(
    ([threadKey, leadGroup]) => {
      const primaryLead = pickPrimaryLeadForThread(leadGroup);
      const plannerId = primaryLead.planner_user_id ?? primaryLead.user_id ?? "";
      const planner = plannerLookup.get(plannerId);
      const wedding = primaryLead.wedding_id
        ? weddingLookup.get(primaryLead.wedding_id)
        : null;
      const createdAt = toValidTimestamp(primaryLead.created_at);
      const threadMessages = buildMergedThreadMessages(
        leadGroup,
        buildPlannerDisplayName(planner),
        messagesByLead,
      );

      console.log("Vendor thread assembly", {
        threadKey,
        chosenLeadId: primaryLead.id,
        mergedLeadIds: leadGroup.map((lead) => lead.id),
        messageCount: threadMessages.length,
      });

      return {
        id: primaryLead.id,
        createdAt: createdAt ?? new Date().toISOString(),
        threadStatus: primaryLead.archived_at
          ? "archived"
          : normalizeThreadStatus(null, primaryLead.status),
        contactMethod: null,
        plannerName: planner?.full_name?.trim() || emailPrefix(planner?.email) || null,
        plannerEmail: planner?.email ?? null,
        plannerPhone: planner?.phone ?? null,
        weddingSummary: wedding
          ? [wedding.culture, wedding.wedding_type, wedding.location]
              .filter(Boolean)
              .join(" · ")
          : null,
        messages: threadMessages,
      } satisfies VendorInquiry;
    },
  );

  console.log("Vendor inquiries visible threads", {
    userId,
    leadCount: rowsWithParticipants.length,
    visibleThreadCount: inquiries.length,
  });

  return inquiries;
}

async function getLeadMessagesMap(
  leadIds: string[],
  leads: LeadRow[],
) {
  noStore();
  if (!leadIds.length) {
    return new Map<string, InquiryMessage[]>();
  }

  const supabase = await createSupabaseServerClient();
  const dbConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!dbConfigured) {
    return new Map<string, InquiryMessage[]>();
  }

  let { data, error } = await supabase
    .from("lead_messages")
    .select("id, lead_id, sender_user_id, body, message, created_at")
    .in("lead_id", leadIds)
    .order("created_at", { ascending: true });

  if (error && supportsLeadMessageFallback(error)) {
    console.warn("Lead messages query retrying with compatible select", {
      table: "lead_messages",
      leadIds,
      error: serializeSupabaseError(error),
    });

    const fallback = await supabase
      .from("lead_messages")
      .select("id, lead_id, sender_user_id, body, message, created_at")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: true });

    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error || !data) {
    const serialized = error ? serializeSupabaseError(error) : null;

    if (isMissingLeadMessagesRelation(error ?? {})) {
      console.warn("Lead messages query skipped because relation is unavailable", {
        table: "lead_messages",
        leadIds,
        error: serialized,
      });
      return new Map<string, InquiryMessage[]>();
    }

    console.error("Lead messages query failed", {
      table: "lead_messages",
      leadIds,
      error: serialized,
    });
    return new Map<string, InquiryMessage[]>();
  }

  console.log("Lead messages query result", {
    table: "lead_messages",
    leadIds,
    rowCount: data.length,
  });

  const map = new Map<string, InquiryMessage[]>();
  const leadParticipants = new Map(
    leads.map((lead) => [
      lead.id,
      {
        plannerUserId: lead.planner_user_id ?? lead.user_id ?? null,
        vendorUserId: lead.vendor_user_id ?? null,
        leadCreatedAt: toValidTimestamp(lead.created_at),
      },
    ]),
  );

  const leadMessageRows = data as LeadMessageRow[];

  console.log("Thread messages loaded", {
    leadIds,
    rowCount: leadMessageRows.length,
    messages: leadMessageRows.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      senderUserId: row.sender_user_id ?? null,
      hasBody: Boolean((row.body ?? "").trim()),
      hasMessage: Boolean((row.message ?? "").trim()),
      createdAt: row.created_at ?? null,
    })),
  });

  for (const row of leadMessageRows) {
    const current = map.get(row.lead_id) ?? [];
    const participants = leadParticipants.get(row.lead_id);
    const senderRole = normalizeSenderRole(
      row.sender_user_id,
      participants?.plannerUserId,
      participants?.vendorUserId,
    );
    current.push({
      id: row.id,
      senderRole,
      senderLabel: senderRole === "vendor" ? "Vendor" : "Planner",
      body: (row.body ?? row.message ?? "").trim(),
      createdAt: toValidTimestamp(row.created_at) ?? participants?.leadCreatedAt ?? null,
    });
    map.set(row.lead_id, current);
  }

  console.log("Lead message role resolution", {
    leadIds,
    rows: (data as LeadMessageRow[]).map((row) => {
      const participants = leadParticipants.get(row.lead_id);
      return {
        leadId: row.lead_id,
        messageId: row.id,
        senderUserId: row.sender_user_id ?? null,
        plannerUserId: participants?.plannerUserId ?? null,
        vendorUserId: participants?.vendorUserId ?? null,
        resolvedRole: normalizeSenderRole(
          row.sender_user_id,
          participants?.plannerUserId,
          participants?.vendorUserId,
        ),
      };
    }),
  });

  console.log("Lead messages mapped per lead", {
    leadIds,
    perLeadCounts: [...map.entries()].map(([leadId, messages]) => ({
      leadId,
      count: messages.length,
    })),
  });

  return map;
}

function buildThreadMessages(
  leadId: string,
  initialMessage: string | null,
  plannerLabel: string,
  messagesByLead: Map<string, InquiryMessage[]>,
  leadCreatedAt?: string | null,
): InquiryMessage[] {
  const normalizedRows = [...(messagesByLead.get(leadId) ?? [])]
    .map((message) => ({
      ...message,
      body: message.body ?? "",
      createdAt: message.createdAt ?? leadCreatedAt ?? null,
      senderLabel:
        message.senderRole === "planner"
          ? plannerLabel
          : (message.senderLabel?.trim() || "Vendor"),
    }))
    .filter((message) => Boolean(message.body.trim()));

  const sortedMessages = normalizedRows.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });

  const initialText = initialMessage?.trim() ?? "";
  if (!initialText) {
    return sortedMessages;
  }

  const initialPlannerMessage: InquiryMessage = {
    id: `${leadId}-initial`,
    senderRole: "planner",
    senderLabel: plannerLabel,
    body: initialText,
    createdAt: leadCreatedAt ?? sortedMessages[0]?.createdAt ?? null,
  };

  const firstMessage = sortedMessages[0];
  const shouldDedupInitialAgainstFirst =
    Boolean(firstMessage) &&
    firstMessage.senderRole === "planner" &&
    firstMessage.body.trim() === initialText;

  if (shouldDedupInitialAgainstFirst) {
    return sortedMessages;
  }

  return [initialPlannerMessage, ...sortedMessages];
}

function buildMergedThreadMessages(
  leadGroup: LeadRow[],
  plannerLabel: string,
  messagesByLead: Map<string, InquiryMessage[]>,
) {
  const vendorLabel =
    leadGroup.find((lead) => lead.vendor_business_name)?.vendor_business_name?.trim() ||
    "Vendor";
  const plannerDisplayLabel =
    leadGroup.find((lead) => lead.planner_display_name)?.planner_display_name?.trim() ||
    plannerLabel;

  const merged = leadGroup.flatMap((lead) =>
    buildThreadMessages(
      lead.id,
      lead.message ?? null,
      plannerDisplayLabel,
      messagesByLead,
      toValidTimestamp(lead.created_at),
    ).map((message) => ({
      ...message,
      senderLabel:
        message.senderRole === "planner" ? plannerDisplayLabel : vendorLabel,
    })),
  );

  const dedupedById = merged.filter(
    (message, index, array) =>
      array.findIndex((entry) => entry.id === message.id) === index,
  );

  return dedupedById.sort((a, b) => {
    const aTime = toTime(a.createdAt);
    const bTime = toTime(b.createdAt);
    return aTime - bTime;
  });
}

async function getPlannerDisplayLabel(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Planner label lookup failed", {
      table: "users",
      userId,
      error: serializeSupabaseError(error),
    });
    return "Planner";
  }

  return data?.full_name?.trim() || emailPrefix(data?.email) || "Planner";
}

function buildPlannerDisplayName(
  planner:
    | { full_name?: string | null; email?: string | null; phone?: string | null }
    | undefined,
) {
  return planner?.full_name?.trim() || emailPrefix(planner?.email) || "Planner";
}

function emailPrefix(email: string | null | undefined) {
  const value = email?.trim();
  if (!value) return null;
  const [prefix] = value.split("@");
  return prefix?.trim() || null;
}

function pickPrimaryLeadForThread(leadGroup: LeadRow[]) {
  const active = leadGroup.filter((lead) => !lead.archived_at);
  if (active.length) {
    return [...active].sort((a, b) => toTime(a.created_at) - toTime(b.created_at))[0];
  }

  return [...leadGroup].sort(
    (a, b) =>
      toTime(b.updated_at ?? b.created_at) - toTime(a.updated_at ?? a.created_at),
  )[0];
}

export async function getPlannerPrimaryWeddingId(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("weddings")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return Array.isArray(data) && data.length ? data[0]?.id ?? null : null;
}

export function buildWhatsAppLink(phone: string | null | undefined, businessName: string) {
  if (!phone) {
    return null;
  }

  const normalized = phone.replace(/[^\d+]/g, "");
  if (!normalized) {
    return null;
  }

  const text = encodeURIComponent(
    `Hello ${businessName}, I found your profile on Iyeoba Weddings and would like to ask about availability.`,
  );
  return `https://wa.me/${normalized.replace(/^\+/, "")}?text=${text}`;
}

export function buildWhatsAppMessageLink(
  phone: string | null | undefined,
  text: string,
) {
  if (!phone) {
    return null;
  }

  const normalized = phone.replace(/[^\d+]/g, "");
  if (!normalized) {
    return null;
  }

  return `https://wa.me/${normalized.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
}

export function buildEmailLink(
  email: string | null | undefined,
  businessName: string,
) {
  if (!email) {
    return null;
  }

  const subject = encodeURIComponent(`Wedding inquiry for ${businessName}`);
  const body = encodeURIComponent(
    `Hello ${businessName}, I found your profile on Iyeoba Weddings and would like to ask about availability.`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export async function canUsePlannerWorkflow() {
  const profile = await getCurrentProfile();
  return profile?.role === "planner" ? profile : null;
}

function normalizeThreadStatus(
  threadStatus: string | null | undefined,
  legacyStatus: string | null | undefined,
): "open" | "contacted" | "closed" | "archived" {
  if (
    legacyStatus === "open" ||
    legacyStatus === "contacted" ||
    legacyStatus === "closed" ||
    legacyStatus === "archived"
  ) {
    return legacyStatus;
  }

  if (
    threadStatus === "open" ||
    threadStatus === "contacted" ||
    threadStatus === "closed" ||
    threadStatus === "archived"
  ) {
    return threadStatus;
  }

  if (legacyStatus === "contacted") {
    return "contacted";
  }
  if (legacyStatus === "booked") {
    return "closed";
  }
  return "open";
}

function normalizeSenderRole(
  senderUserId?: string | null,
  plannerUserId?: string | null,
  vendorUserId?: string | null,
): "planner" | "vendor" | "admin" {
  if (senderUserId && plannerUserId && senderUserId === plannerUserId) {
    return "planner";
  }
  if (senderUserId && vendorUserId && senderUserId === vendorUserId) {
    return "vendor";
  }
  return "vendor";
}

function toValidTimestamp(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toTime(value: string | null | undefined) {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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

function supportsLeadMessageFallback(error: {
  code?: string | null;
  message?: string | null;
}) {
  return isSchemaDriftError(error) || isMissingLeadMessagesRelation(error);
}

function isMissingLeadMessagesRelation(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42P01" || message.includes('relation "lead_messages" does not exist');
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
