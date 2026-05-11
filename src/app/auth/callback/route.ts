import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = normalizeNextPath(requestUrl.searchParams.get("next"));
  let supabase: Awaited<ReturnType<typeof createSupabaseRouteHandlerClient>> | null = null;

  if (code) {
    supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn("[auth:callback] exchangeCodeForSession failed", {
        message: error.message,
        status: "status" in error ? error.status : undefined,
        next,
      });
      return NextResponse.redirect(
        new URL(
          `/auth/sign-in?error=${encodeURIComponent(
            "We could not verify your auth link. Please request a new email link.",
          )}`,
          requestUrl.origin,
        ),
      );
    }
  } else if (tokenHash && type === "recovery") {
    supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) {
      console.warn("[auth:callback] verifyOtp recovery failed", {
        message: error.message,
        status: "status" in error ? error.status : undefined,
        next,
      });
      return NextResponse.redirect(
        new URL(
          `/auth/reset-password?error=${encodeURIComponent(
            "We could not verify your reset link. Please request a new password reset email.",
          )}`,
          requestUrl.origin,
        ),
      );
    }
  }

  const destination =
    next === "/dashboard" && supabase
      ? await getRoleRedirectPath(supabase)
      : next;

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

async function getRoleRedirectPath(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandlerClient>>,
) {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult.user;

  if (userError || !user) {
    console.warn("[auth:callback] confirmed session user lookup failed", {
      message: userError?.message ?? "No user after auth callback.",
    });
    return "/dashboard";
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.warn("[auth:callback] profile role lookup failed", {
      userId: user.id,
      message: profileError.message,
      code: profileError.code,
    });
  }

  const role =
    typeof profile?.role === "string"
      ? profile.role
      : typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role
        : null;

  if (role === "vendor") {
    return "/vendor/dashboard";
  }

  if (role === "planner" || role === "admin") {
    return "/planner/dashboard";
  }

  return "/dashboard";
}
