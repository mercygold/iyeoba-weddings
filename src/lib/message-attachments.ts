import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MESSAGE_ATTACHMENTS_BUCKET } from "@/lib/supabase/storage-constants";

export type MessageAttachment = {
  id: string;
  messageId: string;
  leadId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  signedUrl: string | null;
  createdAt: string | null;
};

const maxFilesPerMessage = 3;
const maxFileSize = 10 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);

export function getMessageAttachmentFiles(formData: FormData) {
  return formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export function validateMessageAttachmentFiles(files: File[]) {
  if (files.length > maxFilesPerMessage) {
    return "You can attach up to 3 files per message.";
  }

  for (const file of files) {
    const extension = getExtension(file.name);
    if (!allowedMimeTypes.has(file.type) || !allowedExtensions.has(extension)) {
      return "Attachments must be JPG, PNG, WEBP, or PDF files.";
    }
    if (file.size > maxFileSize) {
      return "Each attachment must be 10MB or smaller.";
    }
  }

  return null;
}

export async function uploadMessageAttachments(params: {
  leadId: string;
  messageId: string;
  uploaderUserId: string;
  files: File[];
}) {
  if (!params.files.length) {
    return;
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Attachment storage is not configured.");
  }

  await ensureMessageAttachmentBucket();

  const rows = [];
  for (const [index, file] of params.files.entries()) {
    const extension = getExtension(file.name);
    const storagePath = `${params.leadId}/${params.messageId}/${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Attachment upload failed: ${uploadError.message}`);
    }

    rows.push({
      message_id: params.messageId,
      lead_id: params.leadId,
      uploader_user_id: params.uploaderUserId,
      file_name: sanitizeFileName(file.name),
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      storage_path: storagePath,
    });
  }

  const { error: insertError } = await admin
    .from("message_attachments")
    .insert(rows);

  if (insertError) {
    throw new Error(`Attachment record save failed: ${insertError.message}`);
  }
}

export async function getMessageAttachmentsForMessages(messageIds: string[]) {
  if (!messageIds.length) {
    return new Map<string, MessageAttachment[]>();
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Map<string, MessageAttachment[]>();
  }

  const { data, error } = await admin
    .from("message_attachments")
    .select(
      "id, message_id, lead_id, file_name, file_type, file_size, storage_path, created_at",
    )
    .in("message_id", messageIds)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.warn("Message attachments lookup failed", {
      table: "message_attachments",
      messageCount: messageIds.length,
      error: error
        ? {
            code: error.code ?? null,
            message: error.message ?? null,
            details: error.details ?? null,
            hint: error.hint ?? null,
          }
        : null,
    });
    return new Map<string, MessageAttachment[]>();
  }

  const signed = await Promise.all(
    data.map(async (row) => {
      const { data: signedUrlData } = await admin.storage
        .from(MESSAGE_ATTACHMENTS_BUCKET)
        .createSignedUrl(row.storage_path, 60 * 30);

      return {
        id: row.id,
        messageId: row.message_id,
        leadId: row.lead_id,
        fileName: row.file_name,
        fileType: row.file_type,
        fileSize: row.file_size,
        storagePath: row.storage_path,
        signedUrl: signedUrlData?.signedUrl ?? null,
        createdAt: row.created_at ?? null,
      } satisfies MessageAttachment;
    }),
  );

  const map = new Map<string, MessageAttachment[]>();
  for (const attachment of signed) {
    const current = map.get(attachment.messageId) ?? [];
    current.push(attachment);
    map.set(attachment.messageId, current);
  }
  return map;
}

async function ensureMessageAttachmentBucket() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Attachment storage is not configured.");
  }

  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) {
    throw new Error(`Attachment storage check failed: ${error.message}`);
  }

  if ((buckets ?? []).some((bucket) => bucket.name === MESSAGE_ATTACHMENTS_BUCKET)) {
    return;
  }

  const { error: createError } = await admin.storage.createBucket(
    MESSAGE_ATTACHMENTS_BUCKET,
    {
      public: false,
      fileSizeLimit: maxFileSize,
      allowedMimeTypes: [...allowedMimeTypes],
    },
  );

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(`Attachment storage setup failed: ${createError.message}`);
  }
}

function getExtension(filename: string) {
  return filename.split(".").pop()?.trim().toLowerCase() || "";
}

function sanitizeFileName(filename: string) {
  return filename.replace(/[^\w.\- ()]/g, "_").slice(0, 180) || "attachment";
}
