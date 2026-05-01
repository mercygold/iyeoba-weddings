"use client";

import { useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  autoComplete?: string;
  confirmFieldName?: string;
  helpText?: string;
  labelAction?: ReactNode;
  minLength?: number;
  required?: boolean;
  showSuggestion?: boolean;
};

const passwordHelpText =
  "Use at least 8 characters with uppercase, lowercase, a number, and a symbol.";

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  confirmFieldName,
  helpText = passwordHelpText,
  labelAction,
  minLength = 8,
  required = true,
  showSuggestion = false,
}: PasswordFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  function applyPassword(password: string) {
    const input = inputRef.current;
    if (input) {
      input.value = password;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }

    if (confirmFieldName) {
      const form = input?.form;
      const confirmInput = form?.elements.namedItem(confirmFieldName);
      if (confirmInput instanceof HTMLInputElement) {
        confirmInput.value = password;
        confirmInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  function handleSuggestPassword() {
    applyPassword(generateStrongPassword());
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-[color:var(--color-ink)]">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className="field-input rounded-2xl pr-14"
        />
        <button
          type="button"
          aria-label={isVisible ? "Hide password" : "Show password"}
          title={isVisible ? "Hide password" : "Show password"}
          onClick={() => setIsVisible((current) => !current)}
          className={clsx(
            "absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full",
            "text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-soft)] hover:text-[color:var(--color-brand-primary)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-primary)]",
          )}
        >
          {isVisible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.1 5.2A9.3 9.3 0 0 1 12 4.8c5 0 8.5 4.6 9.4 6a2.2 2.2 0 0 1 0 2.4 16 16 0 0 1-2.2 2.6M6.4 6.7a16.3 16.3 0 0 0-3.8 4.1 2.2 2.2 0 0 0 0 2.4c.9 1.4 4.4 6 9.4 6 1.3 0 2.5-.3 3.6-.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M2.6 10.8c.9-1.4 4.4-6 9.4-6s8.5 4.6 9.4 6a2.2 2.2 0 0 1 0 2.4c-.9 1.4-4.4 6-9.4 6s-8.5-4.6-9.4-6a2.2 2.2 0 0 1 0-2.4Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      {helpText ? (
        <p className="text-xs leading-5 text-[color:var(--color-muted)]">
          {helpText}
        </p>
      ) : null}

      {showSuggestion ? (
        <button
          type="button"
          onClick={handleSuggestPassword}
          className="w-fit text-xs font-semibold text-[color:var(--color-brand-primary)] hover:text-[color:var(--color-brand-primary-dark)]"
        >
          Suggest strong password
        </button>
      ) : null}
    </div>
  );
}

function generateStrongPassword() {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*?";
  const all = `${uppercase}${lowercase}${numbers}${symbols}`;
  const requiredCharacters = [
    randomCharacter(uppercase),
    randomCharacter(lowercase),
    randomCharacter(numbers),
    randomCharacter(symbols),
  ];
  const remainingCharacters = Array.from({ length: 12 }, () => randomCharacter(all));

  return shuffleCharacters([...requiredCharacters, ...remainingCharacters]).join("");
}

function randomCharacter(characters: string) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return characters[values[0] % characters.length];
}

function shuffleCharacters(characters: string[]) {
  const shuffled = [...characters];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const swapIndex = values[0] % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
