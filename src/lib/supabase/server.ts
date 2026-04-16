import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { publicUrl, anonKey, isValid, authMessage } = getSupabaseConfigStatus();

  if (!isValid || !publicUrl || !anonKey) {
    return nullSupabaseClient(
      authMessage ?? "Supabase environment variables are not configured.",
    );
  }

  try {
    return createServerClient(publicUrl, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            console.warn("Cookie set skipped (not in server action)");
          }
        },
      },
    });
  } catch {
    return nullSupabaseClient(
      "Supabase auth is configured with invalid values. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}

export async function createSupabaseRouteHandlerClient() {
  return createSupabaseServerClient();
}

function nullSupabaseClient(
  message = "Supabase environment variables are not configured.",
) {
  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async signUp() {
        return {
          data: { user: null, session: null },
          error: new Error(message),
        };
      },
      async signInWithPassword() {
        return {
          data: { user: null, session: null },
          error: new Error(message),
        };
      },
      async signOut() {
        return { error: null };
      },
      async exchangeCodeForSession() {
        return {
          data: { session: null, user: null },
          error: new Error(message),
        };
      },
    },
    from() {
      return {
        select() {
          return this;
        },
        insert() {
          return Promise.resolve({
            data: null,
            error: new Error(message),
          });
        },
        upsert() {
          return Promise.resolve({
            data: null,
            error: new Error(message),
          });
        },
        update() {
          return this;
        },
        delete() {
          return this;
        },
        eq() {
          return this;
        },
        in() {
          return this;
        },
        ilike() {
          return this;
        },
        order() {
          return Promise.resolve({ data: [], error: null });
        },
        then(resolve: (value: { data: null; error: Error }) => unknown) {
          return Promise.resolve(
            resolve({
              data: null,
              error: new Error(message),
            }),
          );
        },
        maybeSingle() {
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}
