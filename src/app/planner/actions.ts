"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePlannerProfile } from "@/lib/auth";
import { getPlannerPrimaryWeddingId } from "@/lib/inquiries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function savePlannerOverviewAction(formData: FormData) {
  const profile = await requirePlannerProfile("/planner/setup");
  const supabase = await createSupabaseServerClient();
  await ensurePlannerUserRow(supabase, profile);

  const nextPath = normalizePlannerNextPath(
    String(formData.get("nextPath") ?? "/planner/dashboard").trim(),
  );
  const culture = String(formData.get("culture") ?? "").trim();
  const weddingType = String(formData.get("weddingType") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const guestCount = Number(String(formData.get("guestCount") ?? "").trim());
  const budgetRange = String(formData.get("budgetRange") ?? "").trim();

  if (!culture || !weddingType || !location || !Number.isFinite(guestCount) || guestCount <= 0 || !budgetRange) {
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not save your planner setup right now.")}`,
    );
  }

  const payload = {
    user_id: profile.id,
    culture,
    wedding_type: weddingType,
    location,
    guest_count: Math.round(guestCount),
    budget_range: budgetRange,
  };

  console.log("Planner overview save attempt", {
    table: "weddings",
    plannerUserId: profile.id,
    payload,
  });

  const existingResult = await supabase
    .from("weddings")
    .select("id")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  console.log("Planner overview existing row lookup", {
    table: "weddings",
    plannerUserId: profile.id,
    dataCount: existingResult.data?.length ?? 0,
    error: existingResult.error ? serializeSupabaseError(existingResult.error) : null,
  });

  if (existingResult.error) {
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not save your planner setup right now.")}`,
    );
  }

  const existingId = existingResult.data?.[0]?.id ?? null;
  if (existingId) {
    const updateResult = await supabase
      .from("weddings")
      .update(payload)
      .eq("id", existingId)
      .eq("user_id", profile.id);

    console.log("Planner overview update response", {
      table: "weddings",
      plannerUserId: profile.id,
      rowId: existingId,
      error: updateResult.error ? serializeSupabaseError(updateResult.error) : null,
    });

    if (updateResult.error) {
      redirect(
        `${nextPath}?error=${encodeURIComponent("We could not save your planner setup right now.")}`,
      );
    }
  } else {
    const insertResult = await supabase.from("weddings").insert(payload);
    console.log("Planner overview insert response", {
      table: "weddings",
      plannerUserId: profile.id,
      error: insertResult.error ? serializeSupabaseError(insertResult.error) : null,
    });

    if (insertResult.error) {
      redirect(
        `${nextPath}?error=${encodeURIComponent("We could not save your planner setup right now.")}`,
      );
    }
  }

  revalidatePath("/planner/setup");
  revalidatePath("/planner/dashboard");
  redirect(`${nextPath}?message=${encodeURIComponent("Planner updated successfully.")}`);
}

export async function saveVendorForPlannerAction(formData: FormData) {
  const profile = await requirePlannerProfile("/planner/dashboard");
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const nextPath = normalizePlannerNextPath(
    String(formData.get("nextPath") ?? "/planner/dashboard").trim(),
  );
  const supabase = await createSupabaseServerClient();
  await ensurePlannerUserRow(supabase, profile);
  const plannerUserRow = await supabase
    .from("users")
    .select("id, role")
    .eq("id", profile.id)
    .maybeSingle();
  console.log("Planner action auth/profile resolution", {
    action: "saveVendorForPlannerAction",
    authProfileId: profile.id,
    usersRowId: plannerUserRow.data?.id ?? null,
    usersRowRole: plannerUserRow.data?.role ?? null,
    usersRowError: plannerUserRow.error ? serializeSupabaseError(plannerUserRow.error) : null,
  });

  if (!vendorId) {
    redirect(`${nextPath}?error=${encodeURIComponent("Vendor record was not found.")}`);
  }

  const payload = {
    user_id: profile.id,
    vendor_id: vendorId,
  };
  console.log("Planner save vendor write attempt", {
    table: "saved_vendors",
    authUserId: profile.id,
    payload,
  });

  const { error } = await supabase.from("saved_vendors").upsert(payload, {
    onConflict: "user_id,vendor_id",
    ignoreDuplicates: false,
  });
  console.log("Planner save vendor upsert response", {
    table: "saved_vendors",
    plannerUserId: profile.id,
    vendorId,
    data: null,
    error: error ? serializeSupabaseError(error) : null,
  });

  if (error) {
    const serializedError = serializeSupabaseError(error);
    console.warn("Planner save vendor upsert failed, attempting compatibility fallback", {
      table: "saved_vendors",
      plannerUserId: profile.id,
      vendorId,
      payload,
      error: serializedError,
    });

    if (serializedError.code === "23505") {
      revalidatePath("/planner/dashboard");
      revalidatePath("/vendors");
      redirect(
        `${nextPath}?message=${encodeURIComponent("Vendor saved to your Planner.")}`,
      );
    }

    const existingResult = await supabase
      .from("saved_vendors")
      .select("id")
      .eq("user_id", profile.id)
      .eq("vendor_id", vendorId);
    console.log("Planner save vendor fallback lookup response", {
      table: "saved_vendors",
      plannerUserId: profile.id,
      vendorId,
      dataCount: existingResult.data?.length ?? 0,
      error: existingResult.error ? serializeSupabaseError(existingResult.error) : null,
    });

    if (existingResult.error) {
      console.error("Planner save vendor fallback lookup failed", {
        table: "saved_vendors",
        plannerUserId: profile.id,
        vendorId,
        payload,
        error: serializeSupabaseError(existingResult.error),
      });
      redirect(
        `${nextPath}?error=${encodeURIComponent("We could not save this vendor right now.")}`,
      );
    }

    if (existingResult.data?.length) {
      revalidatePath("/planner/dashboard");
      revalidatePath("/vendors");
      redirect(
        `${nextPath}?message=${encodeURIComponent("Vendor saved to your Planner.")}`,
      );
    }

    const insertResult = await supabase
      .from("saved_vendors")
      .insert(payload);
    console.log("Planner save vendor fallback insert response", {
      table: "saved_vendors",
      plannerUserId: profile.id,
      vendorId,
      data: null,
      error: insertResult.error ? serializeSupabaseError(insertResult.error) : null,
    });

    if (!insertResult.error) {
      revalidatePath("/planner/dashboard");
      revalidatePath("/vendors");
      redirect(
        `${nextPath}?message=${encodeURIComponent("Vendor saved to your Planner.")}`,
      );
    }

    console.error("Planner save vendor failed", {
      table: "saved_vendors",
      plannerUserId: profile.id,
      vendorId,
      payload,
      error: serializeSupabaseError(insertResult.error ?? error),
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not save this vendor right now.")}`,
    );
  }

  console.log("Planner save vendor revalidating routes", {
    plannerUserId: profile.id,
    routes: ["/planner/dashboard", "/vendors"],
  });
  revalidatePath("/planner/dashboard");
  revalidatePath("/vendors");
  redirect(
    `${nextPath}?message=${encodeURIComponent("Vendor saved to your Planner.")}`,
  );
}

export async function createVendorInquiryAction(formData: FormData) {
  const profile = await requirePlannerProfile("/planner/dashboard");
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const vendorSlug = String(formData.get("vendorSlug") ?? "").trim();
  const nextPath = normalizePlannerNextPath(
    String(formData.get("nextPath") ?? "/planner/dashboard").trim(),
  );
  const contactMethod = String(formData.get("contactMethod") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  await ensurePlannerUserRow(supabase, profile);
  const plannerUserRow = await supabase
    .from("users")
    .select("id, role")
    .eq("id", profile.id)
    .maybeSingle();
  console.log("Planner action auth/profile resolution", {
    action: "createVendorInquiryAction",
    authProfileId: profile.id,
    usersRowId: plannerUserRow.data?.id ?? null,
    usersRowRole: plannerUserRow.data?.role ?? null,
    usersRowError: plannerUserRow.error ? serializeSupabaseError(plannerUserRow.error) : null,
  });

  if (!vendorId) {
    console.error("Planner inquiry validation failed", {
      plannerUserId: profile.id,
      vendorId,
      vendorSlug,
      reason: "missing_vendor_reference",
    });
    redirect(`${nextPath}?error=${encodeURIComponent("Vendor record was not found.")}`);
  }
  if (!isUuid(vendorId)) {
    console.error("Planner inquiry validation failed", {
      plannerUserId: profile.id,
      vendorId,
      vendorSlug,
      reason: "invalid_vendor_uuid",
    });
    redirect(`${nextPath}?error=${encodeURIComponent("Vendor record was not found.")}`);
  }

  const admin = createSupabaseAdminClient();
  const vendorValidationClient = admin ?? supabase;
  const vendorExistsResult = await vendorValidationClient
    .from("vendors")
    .select("id, user_id")
    .eq("id", vendorId)
    .maybeSingle();
  console.log("Planner inquiry vendor validation response", {
    table: "vendors",
    plannerUserId: profile.id,
    vendorId,
    foundVendorId: vendorExistsResult.data?.id ?? null,
    foundVendorUserId: vendorExistsResult.data?.user_id ?? null,
    error: vendorExistsResult.error
      ? serializeSupabaseError(vendorExistsResult.error)
      : null,
    client: admin ? "service_role" : "authenticated_server",
  });
  if (vendorExistsResult.error || !vendorExistsResult.data?.id) {
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not start this inquiry right now.")}`,
    );
  }

  const weddingId = await getPlannerPrimaryWeddingId(profile.id);
  let existingLeadResult = await supabase
    .from("leads")
    .select("id, created_at, updated_at, status, archived_at")
    .eq("planner_user_id", profile.id)
    .eq("vendor_id", vendorId)
    .order("updated_at", { ascending: false });
  console.log("Planner inquiry primary lookup response", {
    table: "leads",
    plannerUserId: profile.id,
    vendorId,
    dataCount: existingLeadResult.data?.length ?? 0,
    error: existingLeadResult.error ? serializeSupabaseError(existingLeadResult.error) : null,
  });

  if (existingLeadResult.error && isSchemaDriftError(existingLeadResult.error)) {
    existingLeadResult = await supabase
      .from("leads")
      .select("id, created_at, updated_at, status, archived_at")
      .eq("planner_user_id", profile.id)
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });
  }

  if (existingLeadResult.error) {
    console.error("Planner inquiry lookup failed", {
      table: "leads",
      plannerUserId: profile.id,
      vendorId,
      vendorSlug,
      error: serializeSupabaseError(existingLeadResult.error),
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not start this inquiry right now.")}`,
    );
  }

  const primaryRows = (existingLeadResult.data ?? []) as LeadThreadRow[];
  let leadId = pickPreferredLeadId(primaryRows);
  if (!leadId) {
    let legacyLeadResult = await supabase
      .from("leads")
      .select("id, created_at, updated_at, status, archived_at")
      .eq("user_id", profile.id)
      .eq("vendor_id", vendorId)
      .order("updated_at", { ascending: false });
    console.log("Planner inquiry legacy lookup response", {
      table: "leads",
      plannerUserId: profile.id,
      vendorId,
      dataCount: legacyLeadResult.data?.length ?? 0,
      error: legacyLeadResult.error ? serializeSupabaseError(legacyLeadResult.error) : null,
    });

    if (legacyLeadResult.error && isSchemaDriftError(legacyLeadResult.error)) {
      legacyLeadResult = await supabase
        .from("leads")
        .select("id, created_at, updated_at, status, archived_at")
        .eq("user_id", profile.id)
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });
    }

    if (legacyLeadResult.error) {
      console.error("Planner inquiry legacy lookup failed", {
        table: "leads",
        plannerUserId: profile.id,
        vendorId,
        vendorSlug,
        error: serializeSupabaseError(legacyLeadResult.error),
      });
      redirect(
        `${nextPath}?error=${encodeURIComponent("We could not start this inquiry right now.")}`,
      );
    }

    const legacyRows = (legacyLeadResult.data ?? []) as LeadThreadRow[];
    leadId = pickPreferredLeadId(legacyRows);
  }
  const now = new Date().toISOString();

  if (leadId) {
    console.log("Planner inquiry reusing existing lead thread", {
      table: "leads",
      plannerUserId: profile.id,
      vendorId,
      vendorSlug,
      chosenLeadId: leadId,
      existingPrimaryCount: primaryRows.length,
      wasLegacyLookupUsed: primaryRows.length === 0,
    });
  }

  if (!leadId) {
    const payloadBase = {
      user_id: profile.id,
      planner_user_id: profile.id,
      vendor_id: vendorId,
      wedding_id: weddingId,
      contact_method: contactMethod || null,
      message: message || null,
      updated_at: now,
    };

    console.log("Planner inquiry write attempt", {
      table: "leads",
      authUserId: profile.id,
      vendorId,
      vendorSlug,
      payload: payloadBase,
    });

    const insertAttempts = [
      { ...payloadBase, status: "new", thread_status: "open" },
      { ...payloadBase, status: "open", thread_status: "open" },
      { ...payloadBase, status: "new", updated_at: undefined },
      { ...payloadBase, status: "open", updated_at: undefined },
      { ...payloadBase, status: "new", contact_method: undefined, thread_status: undefined, updated_at: undefined },
      { ...payloadBase, status: "open", contact_method: undefined, thread_status: undefined, updated_at: undefined },
      { ...payloadBase, status: undefined, contact_method: undefined, thread_status: undefined, updated_at: undefined },
    ].map(stripUndefinedFields);

    let insertError: {
      code?: string | null;
      message?: string | null;
      details?: string | null;
      hint?: string | null;
    } | null = null;
    let insertedId: string | null = null;

    for (const attemptPayload of insertAttempts) {
      const leadInsertQuery = supabase.from("leads").insert(attemptPayload) as {
        select?: (columns: string) => { single: () => Promise<{ data: { id: string } | null; error: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null }> };
      } & Promise<{
        data: { id: string } | null;
        error: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null;
      }>;

      const insertResult =
        typeof leadInsertQuery.select === "function"
          ? await leadInsertQuery.select("id").single()
          : await leadInsertQuery;

      insertedId = insertResult.data?.id ?? null;
      insertError = insertResult.error;
      console.log("Planner inquiry create attempt response", {
        table: "leads",
        plannerUserId: profile.id,
        vendorId,
        insertedId,
        error: insertError ? serializeSupabaseError(insertError) : null,
      });

      if (!insertError && insertedId) {
        break;
      }
      if (insertError && !isSchemaDriftError(insertError)) {
        break;
      }
    }

    if (insertError || !insertedId) {
      console.error("Planner inquiry create failed", {
        table: "leads",
        plannerUserId: profile.id,
        vendorId,
        vendorSlug,
        payload: payloadBase,
        error: insertError ? serializeSupabaseError(insertError) : null,
      });
      redirect(
        `${nextPath}?error=${encodeURIComponent("We could not start this inquiry right now.")}`,
      );
    }

    leadId = insertedId;
    console.log("Planner inquiry created new lead thread", {
      table: "leads",
      plannerUserId: profile.id,
      vendorId,
      vendorSlug,
      createdLeadId: leadId,
    });
  }

  if (leadId && message) {
    const messagePayload = {
      lead_id: leadId,
      sender_user_id: profile.id,
      sender_role: "planner",
      message,
      body: message,
      created_at: now,
    };

    console.log("Planner inquiry message write attempt", {
      table: "lead_messages",
      authUserId: profile.id,
      vendorId,
      leadId,
      payload: messagePayload,
    });

    const { error: messageError } = await supabase
      .from("lead_messages")
      .insert(messagePayload);
    console.log("Planner inquiry message write response", {
      table: "lead_messages",
      plannerUserId: profile.id,
      vendorId,
      leadId,
      data: null,
      error: messageError ? serializeSupabaseError(messageError) : null,
    });

    if (messageError) {
      const fallbackPayload = {
        lead_id: leadId,
        sender_user_id: profile.id,
        body: message,
        message,
      };

      console.warn("Planner inquiry message retrying with fallback payload", {
        table: "lead_messages",
        authUserId: profile.id,
        vendorId,
        leadId,
        payload: fallbackPayload,
        error: serializeSupabaseError(messageError),
      });

      const fallbackResult = await supabase
        .from("lead_messages")
        .insert(fallbackPayload);
      console.log("Planner inquiry message fallback response", {
        table: "lead_messages",
        plannerUserId: profile.id,
        vendorId,
        leadId,
        data: null,
        error: fallbackResult.error ? serializeSupabaseError(fallbackResult.error) : null,
      });

      if (!fallbackResult.error) {
        revalidatePath("/planner/dashboard");
        revalidatePath("/vendor/dashboard");
        redirect(
          `${nextPath}?message=${encodeURIComponent("Inquiry created. You can now contact this vendor directly.")}`,
        );
      }

      const minimalPayload = {
        lead_id: leadId,
        sender_user_id: profile.id,
        message,
      };
      const minimalResult = await supabase.from("lead_messages").insert(minimalPayload);
      console.log("Planner inquiry message minimal fallback response", {
        table: "lead_messages",
        plannerUserId: profile.id,
        vendorId,
        leadId,
        data: null,
        error: minimalResult.error ? serializeSupabaseError(minimalResult.error) : null,
      });

      if (!minimalResult.error) {
        revalidatePath("/planner/dashboard");
        revalidatePath("/vendor/dashboard");
        redirect(
          `${nextPath}?message=${encodeURIComponent("Inquiry created. You can now contact this vendor directly.")}`,
        );
      }

      console.error("Planner inquiry message create failed", {
        table: "lead_messages",
        authUserId: profile.id,
        vendorId,
        leadId,
        payload: minimalPayload,
        error: serializeSupabaseError(minimalResult.error ?? fallbackResult.error ?? messageError),
      });
      redirect(
        `${nextPath}?error=${encodeURIComponent("We could not send your inquiry right now.")}`,
      );
    }
  }

  if (leadId) {
    const leadTouchPayload = {
      updated_at: now,
      thread_status: "open",
    };
    const { error: leadTouchError } = await supabase
      .from("leads")
      .update(leadTouchPayload)
      .eq("id", leadId);
    console.log("Planner inquiry lead touch response", {
      table: "leads",
      plannerUserId: profile.id,
      vendorId,
      leadId,
      error: leadTouchError ? serializeSupabaseError(leadTouchError) : null,
    });

    if (leadTouchError) {
      console.warn("Planner inquiry lead touch failed", {
        table: "leads",
        plannerUserId: profile.id,
        vendorId,
        leadId,
        payload: leadTouchPayload,
        error: serializeSupabaseError(leadTouchError),
      });
    }
  }

  console.log("Planner inquiry revalidating routes", {
    plannerUserId: profile.id,
    vendorId,
    leadId,
    routes: ["/planner/dashboard", "/vendor/dashboard"],
  });
  revalidatePath("/planner/dashboard");
  revalidatePath("/vendor/dashboard");
  redirect(
    `${nextPath}?message=${encodeURIComponent("Inquiry created. You can now contact this vendor directly.")}`,
  );
}

export async function savePlannerProgressItemAction(formData: FormData) {
  const profile = await requirePlannerProfile("/planner/dashboard");
  const supabase = await createSupabaseServerClient();
  await ensurePlannerUserRow(supabase, profile);
  const plannerUserRow = await supabase
    .from("users")
    .select("id, role")
    .eq("id", profile.id)
    .maybeSingle();
  console.log("Planner action auth/profile resolution", {
    action: "savePlannerProgressItemAction",
    authProfileId: profile.id,
    usersRowId: plannerUserRow.data?.id ?? null,
    usersRowRole: plannerUserRow.data?.role ?? null,
    usersRowError: plannerUserRow.error ? serializeSupabaseError(plannerUserRow.error) : null,
  });
  const nextPath = normalizePlannerNextPath(
    String(formData.get("nextPath") ?? "/planner/dashboard").trim(),
  );
  const rawItemKey = String(formData.get("itemKey") ?? "").trim();
  const selectedItemLabel = String(formData.get("itemLabel") ?? "").trim();
  const customItemLabel = String(formData.get("customItemLabel") ?? "").trim();
  const itemLabel = customItemLabel || selectedItemLabel;
  const itemKey = rawItemKey || toProgressKey(itemLabel);
  const status = String(formData.get("status") ?? "").trim();
  const allowedStatuses = new Set(["not_done", "ongoing", "done"]);

  console.log("Planner progress save attempt", {
    table: "blueprints",
    plannerUserId: profile.id,
    itemKey,
    itemLabel,
    requestedStatus: status,
  });

  if (!itemKey || !itemLabel || !allowedStatuses.has(status)) {
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not save this planning update right now.")}`,
    );
  }
  const requestedStatus = normalizePlannerProgressStatus(status);

  const weddingId = await getPlannerPrimaryWeddingId(profile.id);
  const { data: blueprints, error: blueprintError } = await supabase
    .from("blueprints")
    .select("id, checklist_json")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  console.log("Planner progress blueprint load response", {
    table: "blueprints",
    plannerUserId: profile.id,
    dataCount: blueprints?.length ?? 0,
    error: blueprintError ? serializeSupabaseError(blueprintError) : null,
  });

  const blueprint = Array.isArray(blueprints) ? blueprints[0] ?? null : null;

  if (blueprintError) {
    console.error("Planner progress load failed", {
      table: "blueprints",
      plannerUserId: profile.id,
      error: serializeSupabaseError(blueprintError),
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not save this planning update right now.")}`,
    );
  }

  const currentItems = Array.isArray(blueprint?.checklist_json)
    ? blueprint.checklist_json
    : [];
  const normalized = currentItems
    .filter(
      (item): item is { key?: string; label?: string; status?: string } =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      key: String(item.key ?? ""),
      label: String(item.label ?? ""),
      status: normalizePlannerProgressStatus(item.status),
    }));

  const index = normalized.findIndex((item) => item.key === itemKey);
  if (index >= 0) {
    normalized[index] = { key: itemKey, label: itemLabel, status: requestedStatus };
  } else {
    normalized.push({ key: itemKey, label: itemLabel, status: requestedStatus });
  }

  if (blueprint?.id) {
    const { error } = await supabase
      .from("blueprints")
      .update({ checklist_json: normalized })
      .eq("id", blueprint.id);
    console.log("Planner progress update response", {
      table: "blueprints",
      plannerUserId: profile.id,
      blueprintId: blueprint.id,
      normalizedCount: normalized.length,
      error: error ? serializeSupabaseError(error) : null,
    });

    if (error) {
      console.error("Planner progress update failed", {
        table: "blueprints",
        plannerUserId: profile.id,
        blueprintId: blueprint.id,
        error: serializeSupabaseError(error),
      });
      redirect(
        `${nextPath}?error=${encodeURIComponent("We could not save this planning update right now.")}`,
      );
    }
  } else {
    const payload = {
      user_id: profile.id,
      wedding_id: weddingId,
      summary: null,
      timeline_json: [],
      checklist_json: normalized,
      vendor_categories_json: [],
      missing_items_json: [],
    };
    const { error } = await supabase.from("blueprints").insert(payload);
    console.log("Planner progress create response", {
      table: "blueprints",
      plannerUserId: profile.id,
      payload,
      error: error ? serializeSupabaseError(error) : null,
    });
    if (error) {
      console.error("Planner progress create failed", {
        table: "blueprints",
        plannerUserId: profile.id,
        payload,
        error: serializeSupabaseError(error),
      });
      redirect(
        `${nextPath}?error=${encodeURIComponent("We could not save this planning update right now.")}`,
      );
    }
  }

  console.log("Planner progress revalidating routes", {
    plannerUserId: profile.id,
    routes: ["/planner/dashboard"],
  });
  revalidatePath("/planner/dashboard");
  redirect(
    `${nextPath}?message=${encodeURIComponent("Planning progress updated.")}`,
  );
}

export async function removePlannerProgressItemAction(formData: FormData) {
  const profile = await requirePlannerProfile("/planner/dashboard");
  const supabase = await createSupabaseServerClient();
  await ensurePlannerUserRow(supabase, profile);

  const nextPath = normalizePlannerNextPath(
    String(formData.get("nextPath") ?? "/planner/dashboard").trim(),
  );
  const itemKey = String(formData.get("itemKey") ?? "").trim();

  if (!itemKey) {
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not save this planning update right now.")}`,
    );
  }

  const { data: blueprints, error: blueprintError } = await supabase
    .from("blueprints")
    .select("id, checklist_json")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  console.log("Planner progress remove load response", {
    table: "blueprints",
    plannerUserId: profile.id,
    itemKey,
    dataCount: blueprints?.length ?? 0,
    error: blueprintError ? serializeSupabaseError(blueprintError) : null,
  });

  if (blueprintError) {
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not save this planning update right now.")}`,
    );
  }

  const blueprint = Array.isArray(blueprints) ? blueprints[0] ?? null : null;
  if (!blueprint?.id) {
    revalidatePath("/planner/dashboard");
    redirect(`${nextPath}?message=${encodeURIComponent("Planning progress updated.")}`);
  }

  const currentItems = Array.isArray(blueprint.checklist_json)
    ? blueprint.checklist_json
    : [];
  const normalized = currentItems
    .filter(
      (item): item is { key?: string; label?: string; status?: string } =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      key: String(item.key ?? ""),
      label: String(item.label ?? ""),
      status: normalizePlannerProgressStatus(item.status),
    }))
    .filter((item) => item.key !== itemKey);

  const updateResult = await supabase
    .from("blueprints")
    .update({ checklist_json: normalized })
    .eq("id", blueprint.id);

  console.log("Planner progress remove update response", {
    table: "blueprints",
    plannerUserId: profile.id,
    blueprintId: blueprint.id,
    itemKey,
    normalizedCount: normalized.length,
    error: updateResult.error ? serializeSupabaseError(updateResult.error) : null,
  });

  if (updateResult.error) {
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not save this planning update right now.")}`,
    );
  }

  revalidatePath("/planner/dashboard");
  redirect(`${nextPath}?message=${encodeURIComponent("Planning progress updated.")}`);
}

function toProgressKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizePlannerProgressStatus(value: unknown): "not_done" | "ongoing" | "done" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "done" || normalized === "completed") {
    return "done";
  }
  if (normalized === "ongoing" || normalized === "in_progress") {
    return "ongoing";
  }
  return "not_done";
}

export async function updatePlannerInquiryStatusAction(formData: FormData) {
  const profile = await requirePlannerProfile("/planner/dashboard");
  const inquiryId = String(formData.get("inquiryId") ?? "").trim();
  const requestedStatus = String(formData.get("status") ?? "").trim();
  const nextPath = normalizePlannerNextPath(
    String(formData.get("nextPath") ?? "/planner/dashboard").trim(),
  );
  const allowedStatuses = new Set(["open", "contacted", "closed", "archived"]);
  const supabase = await createSupabaseServerClient();
  await ensurePlannerUserRow(supabase, profile);

  if (!inquiryId || !allowedStatuses.has(requestedStatus)) {
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not update this inquiry right now.")}`,
    );
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, user_id, planner_user_id")
    .eq("id", inquiryId)
    .maybeSingle();

  if (
    leadError ||
    !lead?.id ||
    (lead.user_id !== profile.id && lead.planner_user_id !== profile.id)
  ) {
    console.error("Planner inquiry status update failed while loading lead", {
      table: "leads",
      authUserId: profile.id,
      inquiryId,
      requestedStatus,
      error: serializeSupabaseError(leadError ?? {}),
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not update this inquiry right now.")}`,
    );
  }

  const now = new Date().toISOString();
  const payload = {
    status: requestedStatus,
    updated_at: now,
    contacted_at: requestedStatus === "contacted" ? now : null,
    archived_at: requestedStatus === "archived" ? now : null,
  };

  console.log("Planner inquiry status update attempt", {
    table: "leads",
    authUserId: profile.id,
    inquiryId,
    requestedStatus,
    payload,
  });

  let { error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", inquiryId);

  if (error && isSchemaDriftError(error)) {
    const fallbackPayload = {
      status: mapThreadStatusToLegacyStatus(requestedStatus),
      updated_at: now,
      contacted_at: requestedStatus === "contacted" ? now : null,
      archived_at: requestedStatus === "archived" ? now : null,
    };

    console.warn("Planner inquiry status retrying with compatibility payload", {
      table: "leads",
      authUserId: profile.id,
      inquiryId,
      requestedStatus,
      payload: fallbackPayload,
      error: serializeSupabaseError(error),
    });

    const fallbackResult = await supabase
      .from("leads")
      .update(fallbackPayload)
      .eq("id", inquiryId);
    error = fallbackResult.error;
  }

  if (error) {
    console.error("Planner inquiry status update failed", {
      table: "leads",
      authUserId: profile.id,
      inquiryId,
      requestedStatus,
      payload,
      error: serializeSupabaseError(error),
    });
    redirect(
      `${nextPath}?error=${encodeURIComponent("We could not update this inquiry right now.")}`,
    );
  }

  revalidatePath("/planner/dashboard");
  revalidatePath("/vendor/dashboard");
  redirect(
    `${nextPath}?message=${encodeURIComponent("Inquiry status updated.")}`,
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

function stripUndefinedFields<T extends Record<string, unknown>>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as T;
}

type LeadThreadRow = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  archived_at?: string | null;
};

function pickPreferredLeadId(rows: LeadThreadRow[]) {
  if (!rows.length) {
    return null;
  }

  const active = rows.filter((row) => !row.archived_at);
  if (active.length) {
    return [...active].sort((a, b) => toMs(a.created_at) - toMs(b.created_at))[0]?.id ?? null;
  }

  return [...rows].sort(
    (a, b) => toMs(b.updated_at ?? b.created_at) - toMs(a.updated_at ?? a.created_at),
  )[0]?.id ?? null;
}

function toMs(value: string | null | undefined) {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizePlannerNextPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) {
    return "/planner/dashboard";
  }

  const hashIndex = trimmed.indexOf("#");
  const withoutHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const queryIndex = withoutHash.indexOf("?");
  const withoutQuery = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  if (!withoutQuery.startsWith("/")) {
    return "/planner/dashboard";
  }

  return withoutQuery || "/planner/dashboard";
}

async function ensurePlannerUserRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    phone?: string | null;
    role: "planner" | "vendor" | "admin";
  },
) {
  const existing = await supabase
    .from("users")
    .select("id, role")
    .eq("id", profile.id)
    .maybeSingle();

  if (existing.error) {
    console.error("Planner ensure user row lookup failed", {
      table: "users",
      plannerUserId: profile.id,
      error: serializeSupabaseError(existing.error),
    });
    return;
  }

  if (existing.data?.id) {
    return;
  }

  const payload = {
    id: profile.id,
    email: profile.email ?? null,
    full_name: profile.full_name ?? null,
    phone: profile.phone ?? null,
    role: "planner" as const,
  };

  const { error } = await supabase.from("users").insert(payload);
  console.log("Planner ensure user row insert response", {
    table: "users",
    plannerUserId: profile.id,
    payload,
    error: error ? serializeSupabaseError(error) : null,
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
