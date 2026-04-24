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
  const fullName = String(formData.get("fullName") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const role = String(formData.get("role") ?? "planner");
  const next = String(formData.get("next") ?? "");
  const source = String(formData.get("source") ?? "");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role,
      },
    },
  });

  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  const authUserId = data.user?.id;
  const adminClient = createSupabaseAdminClient();

  if (authUserId && adminClient) {
    const { error: userUpsertError } = await adminClient.from("users").upsert({
      id: authUserId,
      email,
      role,
      full_name: fullName || null,
      phone: phone || null,
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
  if (next) {
    redirect(`${next}?message=${encodeURIComponent("Check your email to confirm your account.")}`);
  }

  redirect("/dashboard?message=Check your email to confirm your account.");
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
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/auth/reset-password?message=${encodeURIComponent(
      "Password reset instructions were sent to your email.",
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

  if (password.length < 8) {
    redirect(
      "/auth/update-password?error=Please choose a password with at least 8 characters.",
    );
  }

  if (password !== confirmPassword) {
    redirect("/auth/update-password?error=Passwords do not match.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/update-password?error=${encodeURIComponent(error.message)}`);
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
