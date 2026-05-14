import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getVendorByUserId, getVendorDirectory } from "@/lib/vendors";
import {
  getMessageAttachmentsForMessages,
  type MessageAttachment,
} from "@/lib/message-attachments";

export type InquiryMessage = {
  id: string;
  senderRole: "planner" | "vendor" | "admin";
  senderLabel: string;
  body: string;
  createdAt: string;
  attachments: MessageAttachment[];
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
  created_at: string;
  user_id?: string | null;
  planner_user_id?: string | null;
  vendor_id?: string | null;
  vendor_user_id?: string | null;
  wedding_id?: string | null;
  message?: string | null;
  status?: string | null;
  thread_status?: string | null;
  contact_method?: string | null;
  contacted_at?: string | null;
  archived_at?: string | null;
  updated_at?: string | null;
  vendors?: {
    id: string;
    slug: string;
    business_name: string;
    category: string;
    location: string;
    whatsapp?: string | null;
    contact_email?: string | null;
  } | {
    id: string;
    slug: string;
    business_name: string;
    category: string;
    location: string;
    whatsapp?: string | null;
    contact_email?: string | null;
  }[] | null;
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
  sender_role?: string | null;
  body?: string | null;
  message?: string | null;
  created_at: string;
};

type InquiryUserProfile = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export async function getPlannerSavedVendors(userId: string) {
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

      return {
        id: row.id,
        createdAt: row.created_at,
        vendor: {
          id: vendor.id,
          slug: vendor.slug,
          businessName: vendor.businessName,
          category: vendor.category,
          location: vendor.location,
          priceRange: vendor.priceRange ?? null,
          whatsapp: vendor.whatsapp || null,
          contactEmail: vendor.contactEmail || null,
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
  const supabase = await createSupabaseServerClient();
  const dbConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!dbConfigured) {
    return [] as PlannerInquiry[];
  }

  const fullLeadSelect = `
    id,
    created_at,
    user_id,
    planner_user_id,
    vendor_id,
    vendor_user_id,
    wedding_id,
    message,
    status,
    thread_status,
    contact_method
  `;
  const compatibleLeadSelect = `
    id,
    created_at,
    user_id,
    vendor_id,
    message,
    status
  `;

  const primary = await queryPlannerLeadRows({
    supabase,
    userId,
    select: fullLeadSelect,
    filter: "planner_or_user",
  });
  const primaryRows = primary.rows;

  const legacy =
    primaryRows.length > 0
      ? { rows: [] as LeadRow[], error: null, usedSelect: null }
      : await queryPlannerLeadRows({
          supabase,
          userId,
          select: primary.error && isSchemaDriftError(primary.error)
            ? compatibleLeadSelect
            : fullLeadSelect,
          filter: "user_id",
        });
  const legacyRows = legacy.rows;
  const rows = [...primaryRows, ...legacyRows].filter(
    (row, index, array) => array.findIndex((item) => item.id === row.id) === index,
  );

  if (primary.error && (!legacyRows.length || legacy.error)) {
    console.warn("Planner inquiries query failed; rendering dashboard without planner chat data", {
      table: "leads",
      userId,
      primaryError: serializeSupabaseError(primary.error),
      fallbackError: legacy.error ? serializeSupabaseError(legacy.error) : null,
      primarySelect: primary.usedSelect,
      fallbackSelect: legacy.usedSelect,
    });
    return [] as PlannerInquiry[];
  }

  if (!rows.length) {
    return [] as PlannerInquiry[];
  }

  const vendorIds = rows.map((row) => row.vendor_id).filter(Boolean) as string[];
  const vendorLookup = await getPlannerInquiryVendorMap(vendorIds);
  const plannerProfilesById = await getInquiryPlannerProfilesMap(rows);
  const directoryVendors = await getVendorDirectory();
  const directoryVendorMap = new Map(
    directoryVendors
      .filter((vendor) => vendor.id)
      .map((vendor) => [vendor.id as string, vendor]),
  );
  const messagesByLead = await getLeadMessagesMap(
    rows.map((row) => row.id),
    rows,
  );

  return rows
    .map((row) => {
      const vendor = vendorLookup.get(row.vendor_id ?? "");
      const directoryVendor = directoryVendorMap.get(row.vendor_id ?? "");
      const plannerUserId = row.planner_user_id ?? row.user_id ?? null;
      const planner = plannerUserId ? plannerProfilesById.get(plannerUserId) : null;
      if (!vendor) {
        return null;
      }

      return {
  id: row.id,
  createdAt: row.created_at,
  threadStatus: normalizeThreadStatus(row.thread_status, row.status),
  contactMethod: row.contact_method ?? null,
  vendor: {
    id: vendor.id,
    slug: vendor.slug,
    businessName: vendor.business_name,
    category: vendor.category,
    location: vendor.location,
    whatsapp: vendor.whatsapp ?? null,
    contactEmail: vendor.contactEmail ?? null,
    imageUrl: directoryVendor?.imageUrl ?? "",
  },
  messages: buildThreadMessages(
    row.id,
    row.message ?? null,
    row.created_at,
    getPlannerDisplayName(planner),
    messagesByLead,
  ),
} satisfies PlannerInquiry;
    })
    .filter(Boolean) as PlannerInquiry[];
}

async function queryPlannerLeadRows({
  supabase,
  userId,
  select,
  filter,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  select: string;
  filter: "planner_or_user" | "user_id";
}) {
  const query = supabase.from("leads").select(select) as any;
  const filtered =
    filter === "planner_or_user"
      ? query.or(`planner_user_id.eq.${userId},user_id.eq.${userId}`)
      : query.eq("user_id", userId);
  const result = await filtered.order("created_at", { ascending: false });

  console.log("Planner inquiries query", {
    table: "leads",
    userId,
    filter,
    select,
    count: result.data?.length ?? 0,
    error: result.error ? serializeSupabaseError(result.error) : null,
  });

  return {
    rows: (result.data ?? []) as LeadRow[],
    error: result.error,
    usedSelect: select,
  };
}

async function getPlannerInquiryVendorMap(vendorIds: string[]) {
  const uniqueVendorIds = [...new Set(vendorIds.filter(Boolean))];
  const map = new Map<
  string,
  {
    id: string;
    slug: string;
    business_name: string;
    category: string;
    location: string;
    whatsapp?: string | null;
    contactEmail?: string | null;
    imageUrl: string;
  }
 >();

  if (!uniqueVendorIds.length) {
    return map;
  }

  const supabase = await createSupabaseServerClient();
  const vendorSelect = `
  id,
  slug,
  business_name,
  category,
  location,
  whatsapp,
  contact_email
`;

  const { data, error } = await supabase
    .from("vendors")
    .select(vendorSelect)
    .in("id", uniqueVendorIds);

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
    map.set(vendor.id, {
      ...vendor,
      contactEmail: vendor.contact_email ?? null,
      imageUrl: "",
    });
  }

  return map;
}

export async function getVendorInquiries(userId: string, vendorId?: string | null) {
  const supabase = await createSupabaseServerClient();
  const dbConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!dbConfigured) {
    return [] as VendorInquiry[];
  }

  const leadSelect = `
    id,
    created_at,
    user_id,
    planner_user_id,
    vendor_id,
    vendor_user_id,
    message,
    status,
    thread_status,
    contact_method,
    wedding_id
  `;
  const compatibleLeadSelect = `
    id,
    created_at,
    user_id,
    vendor_id,
    message,
    status
  `;

  let resolvedVendorId = vendorId ?? null;

  if (!resolvedVendorId) {
    const vendor = await getVendorByUserId(userId);
    resolvedVendorId = vendor?.id ?? null;
  }

  if (!resolvedVendorId) {
    console.warn("Vendor inquiries skipped because no vendor profile was found", {
      table: "leads",
      userId,
    });
    return [] as VendorInquiry[];
  }

  let { data, error } = await supabase
    .from("leads")
    .select(leadSelect)
    .eq("vendor_id", resolvedVendorId)
    .order("created_at", { ascending: false });

  if (error && isSchemaDriftError(error)) {
    console.warn("Vendor inquiries query retrying with compatible lead select", {
      table: "leads",
      userId,
      vendorId: resolvedVendorId,
      error: serializeSupabaseError(error),
    });

    const fallback = await supabase
      .from("leads")
      .select(compatibleLeadSelect)
      .eq("vendor_id", resolvedVendorId)
      .order("created_at", { ascending: false });

    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error || !data) {
    console.warn("Vendor inquiries query failed; rendering dashboard without inbox data", {
      table: "leads",
      userId,
      vendorId: resolvedVendorId,
      error: error ? serializeSupabaseError(error) : null,
      select: leadSelect,
    });
    return [] as VendorInquiry[];
  }

  const rows = (data as LeadRow[]).map((row) => ({
    ...row,
    vendor_user_id: row.vendor_user_id ?? userId,
  }));
  if (!rows.length) {
    return [] as VendorInquiry[];
  }

  const plannerProfilesById = await getInquiryPlannerProfilesMap(rows);
  const weddingsById = await getInquiryWeddingsMap(rows);
  const messagesByLead = await getLeadMessagesMap(
    rows.map((row) => row.id),
    rows,
  );

  return rows.map((row) => {
    const plannerUserId = row.planner_user_id ?? row.user_id ?? null;
    const planner = plannerUserId ? plannerProfilesById.get(plannerUserId) : null;
    const wedding = row.wedding_id ? weddingsById.get(row.wedding_id) : null;

    return {
      id: row.id,
      createdAt: row.created_at,
      threadStatus: normalizeThreadStatus(row.thread_status, row.status),
      contactMethod: row.contact_method ?? null,
      plannerName: getOptionalPlannerDisplayName(planner),
      plannerEmail: planner?.email ?? null,
      plannerPhone: planner?.phone ?? null,
      weddingSummary: wedding
        ? [wedding.culture, wedding.wedding_type, wedding.location]
            .filter(Boolean)
            .join(" · ")
        : null,
      messages: buildThreadMessages(
        row.id,
        row.message ?? null,
        row.created_at,
        getPlannerDisplayName(planner),
        messagesByLead,
      ),
    } satisfies VendorInquiry;
  });
}

async function getInquiryPlannerProfilesMap(rows: LeadRow[]) {
  const userIds = [
    ...new Set(
      rows
        .map((row) => row.planner_user_id ?? row.user_id ?? null)
        .filter(Boolean) as string[],
    ),
  ];
  const map = new Map<string, InquiryUserProfile>();

  if (!userIds.length) {
    return map;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, phone")
    .in("id", userIds);

  if (error || !data) {
    console.warn("Vendor inquiry planner profile lookup failed", {
      table: "users",
      userIds,
      error: error ? serializeSupabaseError(error) : null,
    });
    return map;
  }

  for (const profile of data) {
    map.set(profile.id, {
      full_name: profile.full_name ?? null,
      email: profile.email ?? null,
      phone: profile.phone ?? null,
    });
  }

  return map;
}

async function getInquiryWeddingsMap(rows: LeadRow[]) {
  const weddingIds = [
    ...new Set(rows.map((row) => row.wedding_id).filter(Boolean) as string[]),
  ];
  const map = new Map<
    string,
    {
      culture?: string | null;
      wedding_type?: string | null;
      location?: string | null;
    }
  >();

  if (!weddingIds.length) {
    return map;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("weddings")
    .select("id, culture, wedding_type, location")
    .in("id", weddingIds);

  if (error || !data) {
    console.warn("Vendor inquiry wedding lookup failed", {
      table: "weddings",
      weddingIds,
      error: error ? serializeSupabaseError(error) : null,
    });
    return map;
  }

  for (const wedding of data) {
    map.set(wedding.id, {
      culture: wedding.culture ?? null,
      wedding_type: wedding.wedding_type ?? null,
      location: wedding.location ?? null,
    });
  }

  return map;
}

async function getLeadMessagesMap(leadIds: string[], leads: LeadRow[]) {
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
    .select("id, lead_id, sender_user_id, sender_role, body, message, created_at")
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

  const map = new Map<string, InquiryMessage[]>();
  const messageRows = data as LeadMessageRow[];
  const attachmentsByMessage = await getMessageAttachmentsForMessages(
    messageRows.map((row) => row.id),
  );
  const senderUserIds = [
    ...new Set(
      messageRows
        .map((row) => row.sender_user_id)
        .filter(Boolean) as string[],
    ),
  ];
  const senderProfilesById = await getUserProfilesById(senderUserIds);
  const vendorsById = await getInquiryVendorsById(
    leads.map((lead) => lead.vendor_id).filter(Boolean) as string[],
  );
  const leadParticipants = new Map(
    leads.map((lead) => {
      const vendor = lead.vendor_id ? vendorsById.get(lead.vendor_id) : null;
      return [
        lead.id,
        {
          plannerUserId: lead.planner_user_id ?? lead.user_id ?? null,
          vendorUserId: lead.vendor_user_id ?? vendor?.userId ?? null,
          vendorId: lead.vendor_id ?? null,
        },
      ];
    }),
  );

  for (const row of messageRows) {
    const current = map.get(row.lead_id) ?? [];
    const participants = leadParticipants.get(row.lead_id);
    const senderRole = normalizeSenderRole(
      row.sender_role,
      row.sender_user_id,
      participants?.plannerUserId,
      participants?.vendorUserId,
    );
    current.push({
      id: row.id,
      senderRole,
      senderLabel: getSenderLabel({
        senderRole,
        senderUserId: row.sender_user_id ?? null,
        plannerUserId: participants?.plannerUserId ?? null,
        vendorId: participants?.vendorId ?? null,
        senderProfilesById,
        vendorsById,
      }),
      body: row.body ?? row.message ?? "",
      createdAt: row.created_at,
      attachments: attachmentsByMessage.get(row.id) ?? [],
    });
    map.set(row.lead_id, current);
  }

  return map;
}

async function getUserProfilesById(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, InquiryUserProfile>();

  if (!uniqueUserIds.length) {
    return map;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, phone")
    .in("id", uniqueUserIds);

  if (error || !data) {
    console.warn("Inquiry sender profile lookup failed", {
      table: "users",
      userIds: uniqueUserIds,
      error: error ? serializeSupabaseError(error) : null,
    });
    return map;
  }

  for (const profile of data) {
    map.set(profile.id, {
      full_name: profile.full_name ?? null,
      email: profile.email ?? null,
      phone: profile.phone ?? null,
    });
  }

  return map;
}

async function getInquiryVendorsById(vendorIds: string[]) {
  const uniqueVendorIds = [...new Set(vendorIds.filter(Boolean))];
  const map = new Map<string, { businessName: string; userId: string | null }>();

  if (!uniqueVendorIds.length) {
    return map;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, user_id, business_name")
    .in("id", uniqueVendorIds);

  if (error || !data) {
    console.warn("Inquiry sender vendor lookup failed", {
      table: "vendors",
      vendorIds: uniqueVendorIds,
      error: error ? serializeSupabaseError(error) : null,
    });
    return map;
  }

  for (const vendor of data) {
    const businessName = normalizeDisplayName(vendor.business_name);
    map.set(vendor.id, {
      businessName: businessName || "Vendor",
      userId: vendor.user_id ?? null,
    });
  }

  return map;
}

function getSenderLabel({
  senderRole,
  senderUserId,
  plannerUserId,
  vendorId,
  senderProfilesById,
  vendorsById,
}: {
  senderRole: "planner" | "vendor" | "admin";
  senderUserId: string | null;
  plannerUserId: string | null;
  vendorId: string | null;
  senderProfilesById: Map<string, InquiryUserProfile>;
  vendorsById: Map<string, { businessName: string; userId: string | null }>;
}) {
  if (senderRole === "admin") {
    return "Admin";
  }

  if (senderRole === "vendor") {
    return (vendorId && vendorsById.get(vendorId)?.businessName) || "Vendor";
  }

  const profile =
    (senderUserId && senderProfilesById.get(senderUserId)) ||
    (plannerUserId && senderProfilesById.get(plannerUserId)) ||
    null;

  return getPlannerDisplayName(profile);
}

function getPlannerDisplayName(
  profile: InquiryUserProfile | null | undefined,
  fallback = "Planner",
) {
  return (
    normalizeDisplayName(profile?.full_name) ||
    normalizeDisplayName(profile?.email) ||
    fallback
  );
}

function getOptionalPlannerDisplayName(
  profile: InquiryUserProfile | null | undefined,
) {
  return (
    normalizeDisplayName(profile?.full_name) ||
    normalizeDisplayName(profile?.email) ||
    null
  );
}

function normalizeDisplayName(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function buildThreadMessages(
  leadId: string,
  initialMessage: string | null,
  initialCreatedAt: string | null,
  plannerLabel: string,
  messagesByLead: Map<string, InquiryMessage[]>,
): InquiryMessage[] {
  const messages = messagesByLead.get(leadId) ?? [];
  const hasPlannerInitial = messages.some((message) => message.senderRole === "planner");

  if (!initialMessage || hasPlannerInitial) {
    return messages;
  }

  return [
    {
      id: `${leadId}-initial`,
      senderRole: "planner" as const,
      senderLabel: plannerLabel,
      body: initialMessage,
      createdAt: initialCreatedAt ?? messages[0]?.createdAt ?? new Date(0).toISOString(),
      attachments: [],
    },
    ...messages,
  ];
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
  value: string | null | undefined,
  senderUserId?: string | null,
  plannerUserId?: string | null,
  vendorUserId?: string | null,
): "planner" | "vendor" | "admin" {
  if (value === "vendor" || value === "admin") {
    return value;
  }
  if (senderUserId && vendorUserId && senderUserId === vendorUserId) {
    return "vendor";
  }
  if (senderUserId && plannerUserId && senderUserId === plannerUserId) {
    return "planner";
  }
  return "planner";
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
