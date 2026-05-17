"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { signInAction } from "@/app/auth/actions";
import { PasswordField } from "@/components/password-field";

type SignInFormProps = {
  next?: string;
  message?: string;
  error?: string;
};

export function SignInForm({ next = "", message, error }: SignInFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientError, setClientError] = useState("");
  const submitStartedRef = useRef(false);

  return (
    <form
      action={signInAction}
      className="relative z-10 grid gap-5"
      onSubmit={(event) => {
        if (submitStartedRef.current) {
          event.preventDefault();
          return;
        }

        submitStartedRef.current = true;
        setClientError("");
        setIsSubmitting(true);
      }}
    >
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium text-[color:var(--color-ink)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field-input rounded-2xl"
        />
      </div>

      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        helpText=""
        labelAction={
          <Link
            href="/auth/forgot-password"
            className="text-xs font-semibold text-[color:var(--color-brand-primary)] hover:text-[color:var(--color-brand-primary-dark)]"
          >
            Forgot password?
          </Link>
        }
      />

      {message ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {error || clientError ? (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error || clientError}
        </p>
      ) : null}

      <SignInSubmitButton isSubmitting={isSubmitting} />
    </form>
  );
}

function SignInSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  const { pending } = useFormStatus();
  const isBusy = isSubmitting || pending;

  return (
    <div className="grid gap-2 sm:w-fit">
      <button
        type="submit"
        disabled={isBusy}
        aria-busy={isBusy}
        className="btn-primary w-full gap-2 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {isBusy ? <Spinner /> : null}
        <span>{isBusy ? "Signing in..." : "Sign in"}</span>
      </button>
      <p
        aria-live="polite"
        className="min-h-5 text-xs font-medium text-[color:var(--color-muted)]"
      >
        {isBusy ? "Checking your account and opening your dashboard..." : ""}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/45 border-t-white"
    />
  );
}
