"use client";

import { useFormStatus } from "react-dom";

import { signOutAction } from "@/app/auth/actions";

type AuthSignOutFormProps = {
  className?: string;
  onBeforeSubmit?: () => void;
};

export function AuthSignOutForm({ className, onBeforeSubmit }: AuthSignOutFormProps) {
  return (
    <form
      action={signOutAction}
      onSubmit={() => {
        onBeforeSubmit?.();
        clearSupabaseAuthStorage();
      }}
    >
      <SignOutButton className={className} />
    </form>
  );
}

function SignOutButton({ className }: { className?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

function clearSupabaseAuthStorage() {
  if (typeof window === "undefined") return;

  const clearAuthKeys = (storage: Storage) => {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (!key) continue;

      if (isSupabaseAuthStorageKey(key)) {
        storage.removeItem(key);
      }
    }
  };

  try {
    clearAuthKeys(window.localStorage);
    clearAuthKeys(window.sessionStorage);
  } catch {
    // Storage may be unavailable in private browsing modes.
  }
}

function isSupabaseAuthStorageKey(key: string) {
  return (
    (key.startsWith("sb-") &&
      (key.endsWith("-auth-token") || key.endsWith("-auth-token-code-verifier"))) ||
    key.includes("supabase.auth.token") ||
    key.includes("supabase-auth-token")
  );
}
