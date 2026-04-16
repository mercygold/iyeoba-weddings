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

type InquiryRow = {
  id: string;
  created_at: string | null;
  planner_user_id: string | null;
  vendor_user_id: string | null;
  vendor_profile_id: string;
  initial_message: string | null;
  status: string | null;
  updated_at: string | null;
  contacted_at?: string | null;
  archived_at?: string | null;
};

type InquiryMessageRow = {
  id: string;
  inquiry_id: string;
  sender_user_id: string | null;
  message_body: string | null;
  created_at: string | null;
};

export async function getPlannerSavedVendors(userId: string) {
  noStore();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
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

  if (error || !data) {
    console.error("Planner saved vendors query failed", {
      table: "saved_vendors",
      userId,
      error: error ? serializeSupabaseError(error) : null,
    });
    return [] as PlannerSavedVendor[];
  }

  const savedVendorIds = data.map((row) => row.vendor_id).filter(Boolean);
  const publicVendors = await getVendorDirectory();
  const vendorMap = new Map(publicVendors.map((vendor) => [vendor.id, vendor]));

  const results = data
    .map((row) => {
      const vendor = vendorMap.get(row.vendor_id);
      if (!vendor?.id) {
        return null;
      }
      const normalizedCategory = normalizeVendorCategory(
        vendor.category,
        vendor.customCategory ?? null,
      );

      return {
        id: row.id,
        createdAt: row.created_at,
        vendor: {
          id: vendor.id,
          slug: vendor.slug,
          businessName: vendor.businessName,
          category: normalizedCategory.category,
          location: vendor.location,
          whatsapp: vendor.whatsapp || null,
          contactEmail: null,
          imageUrl: vendor.imageUrl,
        },
      } satisfies PlannerSavedVendor;
    })
    .filter(Boolean) as PlannerSavedVendor[];

  console.log("Planner saved vendors query", {
    userId,
    savedVendorIds,
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

  const inquirySelect = `
    id,
    created_at,
    planner_user_id,
    vendor_user_id,
    vendor_profile_id,
    initial_message,
    status,
    contacted_at,
    archived_at,
    updated_at
  `;

  const plannerResult = await supabase
    .from("inquiries")
    .select(inquirySelect)
    .eq("planner_user_id", userId)
    .order("updated_at", { ascending: false });

  console.log("Planner inquiries query", {
    table: "inquiries",
    userId,
    filter: "planner_user_id",
    select: inquirySelect,
    count: plannerResult.data?.length ?? 0,
    error: plannerResult.error ? serializeSupabaseError(plannerResult.error) : null,
  });

  if (plannerResult.error || !plannerResult.data) {
    console.error("Planner inquiries query failed", {
      table: "inquiries",
      userId,
      error: plannerResult.error ? serializeSupabaseError(plannerResult.error) : null,
    });
    return [] as PlannerInquiry[];
  }

  const rows = plannerResult.data as InquiryRow[];

  if (!rows.length) {
    return [] as PlannerInquiry[];
  }

  const vendorIds = rows.map((row) => row.vendor_profile_id).filter(Boolean);
  const vendorLookup = await getPlannerInquiryVendorMap(vendorIds);
  const directoryVendors = await getVendorDirectory();
  const directoryVendorMap = new Map(
    directoryVendors
      .filter((vendor) => vendor.id)
      .map((vendor) => [vendor.id as string, vendor]),
  );
  const messagesByInquiry = await getInquiryMessagesMap(
    rows.map((row) => row.id),
    rows,
  );

  const inquiries = rows
    .map((row) => {
      const vendor = vendorLookup.get(row.vendor_profile_id);
      const directoryVendor = directoryVendorMap.get(row.vendor_profile_id);
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
      const threadMessages = buildThreadMessages(
        row.id,
        row.initial_message ?? null,
        "planner",
        messagesByInquiry,
        toValidTimestamp(row.created_at),
      );

      console.log("Planner thread assembly", {
        leadId: row.id,
        hasInitialMessage: Boolean(row.initial_message?.trim()),
        leadMessagesCount: messagesByInquiry.get(row.id)?.length ?? 0,
        finalThreadCount: threadMessages.length,
      });

      return {
        id: row.id,
        createdAt: toValidTimestamp(row.created_at) ?? new Date().toISOString(),
        threadStatus: normalizeThreadStatus(null, row.status),
        contactMethod: null,
        vendor: {
          id:
            vendor?.id ??
            directoryVendor?.id ??
            row.vendor_profile_id ??
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
  noStore();
  const supabase = await createSupabaseServerClient();
  const dbConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!dbConfigured) {
    return [] as VendorInquiry[];
  }

  const inquirySelect = `
    id,
    created_at,
    planner_user_id,
    vendor_user_id,
    vendor_profile_id,
    initial_message,
    status,
    contacted_at,
    archived_at,
    updated_at
  `;
  const inquiryResult = await supabase
    .from("inquiries")
    .select(inquirySelect)
    .eq("vendor_user_id", userId)
    .order("updated_at", { ascending: false });

  console.log("Vendor inquiries query", {
    table: "inquiries",
    userId,
    filter: "vendor_user_id",
    select: inquirySelect,
    count: inquiryResult.data?.length ?? 0,
    error: inquiryResult.error ? serializeSupabaseError(inquiryResult.error) : null,
  });

  if (inquiryResult.error || !inquiryResult.data) {
    console.error("Vendor inquiries query failed", {
      table: "inquiries",
      userId,
      select: inquirySelect,
      error: inquiryResult.error ? serializeSupabaseError(inquiryResult.error) : null,
    });
    return [] as VendorInquiry[];
  }

  const rows = inquiryResult.data as InquiryRow[];
  if (!rows.length) {
    return [] as VendorInquiry[];
  }

  const plannerIds = rows
    .map((row) => row.planner_user_id)
    .filter(Boolean) as string[];
  const uniquePlannerIds = [...new Set(plannerIds)];

  const plannerLookup = new Map<
    string,
    { full_name?: string | null; email?: string | null; phone?: string | null }
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

  const messagesByInquiry = await getInquiryMessagesMap(
    rows.map((row) => row.id),
    rows,
  );

  return rows.map((row) => {
    const plannerId = row.planner_user_id ?? "";
    const planner = plannerLookup.get(plannerId);
    const createdAt = toValidTimestamp(row.created_at);

    return {
      id: row.id,
      createdAt: createdAt ?? new Date().toISOString(),
      threadStatus: normalizeThreadStatus(null, row.status),
      contactMethod: null,
      plannerName: planner?.full_name ?? null,
      plannerEmail: planner?.email ?? null,
      plannerPhone: planner?.phone ?? null,
      weddingSummary: null,
      messages: buildThreadMessages(
        row.id,
        row.initial_message ?? null,
        planner?.full_name || planner?.email || "Planner",
        messagesByInquiry,
        createdAt,
      ),
    } satisfies VendorInquiry;
  });
}

async function getInquiryMessagesMap(
  inquiryIds: string[],
  inquiries: InquiryRow[],
) {
  noStore();
  if (!inquiryIds.length) {
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

  const { data, error } = await supabase
    .from("inquiry_messages")
    .select("id, inquiry_id, sender_user_id, message_body, created_at")
    .in("inquiry_id", inquiryIds)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("Inquiry messages query failed", {
      table: "inquiry_messages",
      inquiryIds,
      error: error ? serializeSupabaseError(error) : null,
    });
    return new Map<string, InquiryMessage[]>();
  }

  console.log("Inquiry messages query result", {
    table: "inquiry_messages",
    inquiryIds,
    rowCount: data.length,
  });

  const map = new Map<string, InquiryMessage[]>();
  const inquiryParticipants = new Map(
    inquiries.map((inquiry) => [
      inquiry.id,
      {
        plannerUserId: inquiry.planner_user_id,
        vendorUserId: inquiry.vendor_user_id,
        inquiryCreatedAt: toValidTimestamp(inquiry.created_at),
      },
    ]),
  );

  const inquiryMessageRows = data as InquiryMessageRow[];

  console.log("Thread messages loaded", {
    inquiryIds,
    rowCount: inquiryMessageRows.length,
    messages: inquiryMessageRows.map((row) => ({
      id: row.id,
      inquiryId: row.inquiry_id,
      senderUserId: row.sender_user_id ?? null,
      hasMessageBody: Boolean((row.message_body ?? "").trim()),
      createdAt: row.created_at ?? null,
    })),
  });

  for (const row of inquiryMessageRows) {
    const current = map.get(row.inquiry_id) ?? [];
    const participants = inquiryParticipants.get(row.inquiry_id);
    const senderRole = normalizeSenderRole(
      row.sender_user_id,
      participants?.plannerUserId,
      participants?.vendorUserId,
    );
    current.push({
      id: row.id,
      senderRole,
      senderLabel: senderRole === "vendor" ? "Vendor" : "Planner",
      body: (row.message_body ?? "").trim(),
      createdAt: toValidTimestamp(row.created_at) ?? participants?.inquiryCreatedAt ?? null,
    });
    map.set(row.inquiry_id, current);
  }

  console.log("Inquiry message role resolution", {
    inquiryIds,
    rows: (data as InquiryMessageRow[]).map((row) => {
      const participants = inquiryParticipants.get(row.inquiry_id);
      return {
        inquiryId: row.inquiry_id,
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

  console.log("Inquiry messages mapped per inquiry", {
    inquiryIds,
    perInquiryCounts: [...map.entries()].map(([inquiryId, messages]) => ({
      inquiryId,
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
