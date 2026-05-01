import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TikTokFeatureRequestStatus =
  | "pending_review"
  | "needs_changes"
  | "approved"
  | "scheduled"
  | "posted"
  | "not_eligible"
  | "cancelled";

export type TikTokFeatureEligibilityStatus =
  | "full_launch_offer"
  | "intro_feature_only"
  | "needs_profile_completion"
  | "not_eligible";

export type VendorTikTokFeatureRequest = {
  id: string;
  vendorId: string;
  userId: string | null;
  businessName: string | null;
  category: string | null;
  socialLink: string;
  contentLink: string;
  caption: string | null;
  permissionConfirmed: boolean;
  status: TikTokFeatureRequestStatus;
  eligibilityStatus: TikTokFeatureEligibilityStatus | null;
  adminNotes: string | null;
  scheduledFor: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminTikTokFeatureRequest = VendorTikTokFeatureRequest & {
  vendorStatus: string | null;
  vendorProfileStatus: string | null;
  vendorApproved: boolean | null;
  vendorPortfolioCount: number;
};

const tiktokFeatureRequestSelect = `
  id,
  vendor_id,
  user_id,
  business_name,
  category,
  social_link,
  content_link,
  caption,
  permission_confirmed,
  status,
  eligibility_status,
  admin_notes,
  scheduled_for,
  posted_at,
  created_at,
  updated_at
`;

const adminTikTokFeatureRequestSelect = `
  ${tiktokFeatureRequestSelect},
  vendor:vendors(status, profile_status, approved, vendor_portfolio(image_url))
`;

export async function getLatestVendorTikTokFeatureRequest(vendorId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await (supabase as any)
    .from("vendor_tiktok_feature_requests")
    .select(tiktokFeatureRequestSelect)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error && !isMissingTikTokFeatureRequestTable(error)) {
      console.warn("Vendor TikTok feature request lookup failed", {
        vendorId,
        error: serializeSupabaseError(error),
      });
    }
    return null;
  }

  return mapVendorTikTokFeatureRequest(data);
}

export async function getAdminTikTokFeatureRequests() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return [];
  }

  const { data, error } = await (admin as any)
    .from("vendor_tiktok_feature_requests")
    .select(adminTikTokFeatureRequestSelect)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error && !isMissingTikTokFeatureRequestTable(error)) {
      console.warn("Admin TikTok feature request lookup failed", {
        error: serializeSupabaseError(error),
      });
    }
    return [];
  }

  return data.map((row: any) => {
    const request = mapVendorTikTokFeatureRequest(row);
    const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;
    return {
      ...request,
      vendorStatus: vendor?.status ?? null,
      vendorProfileStatus: vendor?.profile_status ?? null,
      vendorApproved: vendor?.approved ?? null,
      vendorPortfolioCount: vendor?.vendor_portfolio?.length ?? 0,
    } satisfies AdminTikTokFeatureRequest;
  });
}

export function getTikTokFeatureRequestStatusLabel(
  status: string | null | undefined,
) {
  switch (status) {
    case "pending_review":
      return "Pending Review";
    case "needs_changes":
      return "Needs Changes";
    case "approved":
      return "Approved";
    case "scheduled":
      return "Scheduled";
    case "posted":
      return "Posted";
    case "not_eligible":
      return "Not Eligible";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending Review";
  }
}

export function getTikTokFeatureEligibilityLabel(
  status: string | null | undefined,
) {
  switch (status) {
    case "full_launch_offer":
      return "Full Launch Offer";
    case "intro_feature_only":
      return "Intro Feature Only";
    case "needs_profile_completion":
      return "Needs Profile Completion";
    case "not_eligible":
      return "Not Eligible";
    default:
      return "Review Needed";
  }
}

export function calculateTikTokFeatureEligibility(input: {
  status?: string | null;
  approved?: boolean | null;
  socialLink?: string | null;
  portfolioImageCount?: number;
  contentLink?: string | null;
  permissionConfirmed?: boolean;
}) {
  const status = input.status ?? "draft";
  const approved = input.approved || status === "approved";
  const hasSocial = Boolean(input.socialLink?.trim());
  const hasPortfolioImage = (input.portfolioImageCount ?? 0) > 0;
  const hasContentLink = Boolean(input.contentLink?.trim());
  const hasPermission = Boolean(input.permissionConfirmed);

  if (["rejected", "suspended", "archived"].includes(status) || !approved) {
    return "not_eligible" satisfies TikTokFeatureEligibilityStatus;
  }

  if (!hasSocial || !hasPortfolioImage || !hasContentLink || !hasPermission) {
    return "needs_profile_completion" satisfies TikTokFeatureEligibilityStatus;
  }

  if ((input.portfolioImageCount ?? 0) < 4) {
    return "intro_feature_only" satisfies TikTokFeatureEligibilityStatus;
  }

  return "full_launch_offer" satisfies TikTokFeatureEligibilityStatus;
}

export function isMissingTikTokFeatureRequestTable(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("could not find the table") &&
      message.includes("vendor_tiktok_feature_requests"))
  );
}

function mapVendorTikTokFeatureRequest(row: any): VendorTikTokFeatureRequest {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    userId: row.user_id ?? null,
    businessName: row.business_name ?? null,
    category: row.category ?? null,
    socialLink: row.social_link,
    contentLink: row.content_link,
    caption: row.caption ?? null,
    permissionConfirmed: row.permission_confirmed ?? false,
    status: row.status ?? "pending_review",
    eligibilityStatus: row.eligibility_status ?? null,
    adminNotes: row.admin_notes ?? null,
    scheduledFor: row.scheduled_for ?? null,
    postedAt: row.posted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
