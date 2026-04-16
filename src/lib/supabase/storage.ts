import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  VENDOR_DOCUMENTS_BUCKET,
  VENDOR_PORTFOLIO_BUCKET,
} from "@/lib/supabase/storage-constants";

export async function ensureVendorStorageBuckets() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Supabase service-role access is required to create vendor storage buckets.",
    };
  }

  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    console.error("Failed to list Supabase storage buckets", listError);
    return {
      ok: false,
      error: "We could not verify vendor file storage right now.",
    };
  }

  const existing = new Set((buckets ?? []).map((bucket) => bucket.name));

  if (!existing.has(VENDOR_PORTFOLIO_BUCKET)) {
    const { error } = await admin.storage.createBucket(VENDOR_PORTFOLIO_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/*"],
    });

    if (error && !error.message.toLowerCase().includes("already exists")) {
      console.error("Failed to create vendor portfolio bucket", error);
      return {
        ok: false,
        error: "We could not prepare portfolio uploads right now.",
      };
    }
  }

  if (!existing.has(VENDOR_DOCUMENTS_BUCKET)) {
    const { error } = await admin.storage.createBucket(VENDOR_DOCUMENTS_BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/*", "application/pdf"],
    });

    if (error && !error.message.toLowerCase().includes("already exists")) {
      console.error("Failed to create vendor documents bucket", error);
      return {
        ok: false,
        error: "We could not prepare document uploads right now.",
      };
    }
  }

  return { ok: true as const, error: null };
}

export async function uploadVendorPortfolioFiles(params: {
  vendorId: string;
  files: File[];
}) {
  const admin = createSupabaseAdminClient();
  if (!admin || !params.files.length) {
    return [];
  }

  const uploaded: string[] = [];

  for (const [index, file] of params.files.entries()) {
    if (!file.size) {
      continue;
    }

    const ext = getExtension(file.name);
    const path = `${params.vendorId}/${Date.now()}-${index}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await admin.storage
      .from(VENDOR_PORTFOLIO_BUCKET)
      .upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (!error) {
      const { data } = admin.storage
        .from(VENDOR_PORTFOLIO_BUCKET)
        .getPublicUrl(path);
      if (data.publicUrl) {
        uploaded.push(data.publicUrl);
      }
    }
  }

  return uploaded;
}

export async function uploadVendorGovernmentId(params: {
  vendorId: string;
  file: File | null;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin || !params.file || !params.file.size) {
    return null;
  }

  const ext = getExtension(params.file.name);
  const path = `${params.vendorId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());

  const { error } = await admin.storage
    .from(VENDOR_DOCUMENTS_BUCKET)
    .upload(path, buffer, {
      contentType: params.file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    return null;
  }

  return path;
}

function getExtension(filename: string) {
  const value = filename.split(".").pop()?.trim().toLowerCase();
  return value || "bin";
}
