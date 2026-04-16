import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureVendorStorageBuckets } from "@/lib/supabase/storage";
import {
  VENDOR_DOCUMENTS_BUCKET,
  VENDOR_PORTFOLIO_BUCKET,
} from "@/lib/supabase/storage-constants";

const allowedBuckets = new Set([
  VENDOR_PORTFOLIO_BUCKET,
  VENDOR_DOCUMENTS_BUCKET,
]);

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in before uploading files." },
        { status: 401 },
      );
    }

    if (!admin) {
      return NextResponse.json(
        { error: "Server-side Supabase access is not configured." },
        { status: 500 },
      );
    }

    const storageSetup = await ensureVendorStorageBuckets();
    if (!storageSetup.ok) {
      return NextResponse.json(
        { error: storageSetup.error },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      bucket?: string;
      fileName?: string;
      contentType?: string;
    };

    const bucket = body.bucket ?? "";
    const fileName = body.fileName ?? "upload.bin";
    const contentType = body.contentType ?? "application/octet-stream";

    if (!allowedBuckets.has(bucket)) {
      return NextResponse.json(
        { error: "Unsupported upload bucket." },
        { status: 400 },
      );
    }

    const extension = getExtension(fileName);
    const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (error || !data?.token) {
      console.error("Failed to create signed upload url", {
        bucket,
        filePath,
        error,
      });
      return NextResponse.json(
        { error: "We could not prepare your upload right now." },
        { status: 500 },
      );
    }

    const publicUrl =
      bucket === VENDOR_PORTFOLIO_BUCKET
        ? admin.storage.from(bucket).getPublicUrl(filePath).data.publicUrl
        : null;

    return NextResponse.json({
      bucket,
      path: filePath,
      token: data.token,
      publicUrl,
      contentType,
    });
  } catch (error) {
    console.error("Unexpected vendor upload signing error", error);
    return NextResponse.json(
      { error: "We could not prepare your upload right now." },
      { status: 500 },
    );
  }
}

function getExtension(fileName: string) {
  const value = fileName.split(".").pop()?.trim().toLowerCase();
  return value || "bin";
}
