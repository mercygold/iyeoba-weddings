"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { trackServerEvent } from "@/lib/analytics-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signUpAction(formData: FormData) {
  const config = getSupabaseConfigStatus();
  if (config.authMessage) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(config.authMessage)}`);
  }

  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const countryCode = String(formData.get("countryCode") ?? "").trim().toUpperCase();
  const country = String(formData.get("country") ?? "").trim();
  const phoneCountryCode = String(formData.get("phoneCountryCode") ?? "").trim();
  const phoneNumber = String(formData.get("phoneNumber") ?? formData.get("phone") ?? "").trim();
  const normalizedPhoneNumber = phoneNumber.replace(/[^\d]/g, "");
  const phone = normalizedPhoneNumber;
  const fullPhoneNumber = `${phoneCountryCode}${normalizedPhoneNumber}`;
  const role = String(formData.get("role") ?? "planner");
  const next = String(formData.get("next") ?? "");
  const source = String(formData.get("source") ?? "");
  const requestOrigin = await getRequestOrigin();
  const siteUrl = getAuthSiteUrl(requestOrigin);

  if (password.length < 8) {
    redirect(
      "/auth/sign-up?error=Please choose a password with at least 8 characters.",
    );
  }

  if (password !== confirmPassword) {
    redirect("/auth/sign-up?error=Passwords do not match.");
  }

  if (!country || !countryCode || !phoneCountryCode || !normalizedPhoneNumber) {
    redirect("/auth/sign-up?error=Please select your country and provide a valid phone number.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        full_name: fullName,
        phone,
        phone_number: normalizedPhoneNumber,
        phone_country_code: phoneCountryCode,
        full_phone_number: fullPhoneNumber,
        country,
        country_code: countryCode,
        role,
      },
    },
  });

  if (error) {
    logAuthIssue("signUp", {
      email,
      role,
      siteUrl,
      error,
    });

    const message = normalizeSignUpErrorMessage(error.message);
    redirect(`/auth/sign-up?error=${encodeURIComponent(message)}`);
  }

  logAuthIssue("signUpResult", {
    email,
    role,
    userId: data.user?.id ?? null,
    emailConfirmedAt: data.user?.email_confirmed_at ?? null,
    hasSession: Boolean(data.session),
  });

  const authUserId = data.user?.id;
  const adminClient = createSupabaseAdminClient();

  if (authUserId && adminClient) {
    const { error: userUpsertError } = await adminClient.from("users").upsert({
      id: authUserId,
      email,
      role,
      full_name: fullName || null,
      phone: phone || null,
      country: country || null,
      country_code: countryCode || null,
      phone_country_code: phoneCountryCode || null,
      phone_number: normalizedPhoneNumber || null,
      full_phone_number: fullPhoneNumber || null,
    });

    if (userUpsertError) {
      console.error("Failed to sync signed-up user into public.users", {
        authUserId,
        email,
        role,
        error: userUpsertError,
      });
    }

    if (role === "vendor") {
      const { data: existingVendor, error: existingVendorError } = await adminClient
        .from("vendors")
        .select("id")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (existingVendorError) {
        console.error("Failed to check existing vendor record during signup", {
          authUserId,
          error: existingVendorError,
        });
      }

      if (!existingVendor) {
        const slug = buildVendorSlug(fullName || email);
        const { error: vendorInsertError } = await adminClient.from("vendors").insert({
          user_id: authUserId,
          business_name: fullName || email,
          slug,
          category: "Vendor",
          location: "To be updated",
          culture: "Yoruba",
          culture_specialization: "Yoruba",
          description: "Vendor profile created during signup.",
          approved: false,
          verified: false,
          status: "draft",
          profile_status: "draft",
          onboarding_completed: false,
          availability_status: "Draft profile",
        });

        if (vendorInsertError) {
          console.error("Failed to seed vendor record during signup", {
            authUserId,
            slug,
            error: vendorInsertError,
          });
        }
      }
    }
  }

  await trackServerEvent({
    eventName: "sign_up",
    source: source || undefined,
    path: next || "/dashboard",
    role,
    payload: { role },
  });

  await trackServerEvent({
    eventName: role === "vendor" ? "vendor_signup" : "planner_signup",
    source: source || undefined,
    path: next || "/dashboard",
    role,
    payload: { role },
  });

  revalidatePath("/");

  const successMessage = "Check your email to confirm your account. Also check spam/promotions.";

  if (!data.session) {
    redirect(`/auth/sign-in?message=${encodeURIComponent(successMessage)}`);
  }

  if (next) {
    redirect(`${next}?message=${encodeURIComponent(successMessage)}`);
  }

  redirect(`/dashboard?message=${encodeURIComponent(successMessage)}`);
}

export async function signInAction(formData: FormData) {
  const config = getSupabaseConfigStatus();
  if (config.authMessage) {
    redirect(`/auth/sign-in?error=${encodeURIComponent(config.authMessage)}`);
  }

  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  redirect(next || "/dashboard");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(formData: FormData) {
  const config = getSupabaseConfigStatus();
  if (config.authMessage) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(config.authMessage)}`);
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/auth/reset-password?error=Please enter your account email.");
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getRequestOrigin();
  const siteUrl = getAuthSiteUrl(origin);
  const redirectTo = `${siteUrl}/auth/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    logAuthIssue("resetPasswordForEmail", {
      email,
      redirectTo,
      error,
    });

    redirect(
      `/auth/reset-password?message=${encodeURIComponent(
        "If the account exists, a reset link has been sent. Check spam/promotions too.",
      )}`,
    );
  }

  redirect(
    `/auth/reset-password?message=${encodeURIComponent(
      "If the account exists, a reset link has been sent. Check spam/promotions too.",
    )}`,
  );
}

export async function updatePasswordAction(formData: FormData) {
  const config = getSupabaseConfigStatus();
  if (config.authMessage) {
    redirect(`/auth/update-password?error=${encodeURIComponent(config.authMessage)}`);
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const returnTo = normalizeReturnPath(String(formData.get("returnTo") ?? ""));

  if (password.length < 8) {
    redirect(
      `${returnTo}?error=Please choose a password with at least 8 characters.`,
    );
  }

  if (password !== confirmPassword) {
    redirect(`${returnTo}?error=Passwords do not match.`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  redirect(
    `/auth/sign-in?message=${encodeURIComponent(
      "Password updated successfully. You can sign in now.",
    )}`,
  );
}

function buildVendorSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

function getAuthSiteUrl(origin: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    const normalized = normalizeSiteUrl(configured);
    if (normalized) {
      return normalized;
    }
  }

  if (process.env.NODE_ENV === "production") {
    return "https://www.iyeobaweddings.com";
  }

  const normalizedOrigin = normalizeSiteUrl(origin);
  return normalizedOrigin ?? "http://localhost:3000";
}

function normalizeSiteUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return null;
  }
}

function normalizeReturnPath(value: string) {
  return value === "/auth/reset-password" ? value : "/auth/update-password";
}

function normalizeSignUpErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account with this email already exists. Try signing in or resetting your password.";
  }
  return message;
}

function logAuthIssue(action: string, details: Record<string, unknown>) {
  console.error(`[auth:${action}]`, details);
}
