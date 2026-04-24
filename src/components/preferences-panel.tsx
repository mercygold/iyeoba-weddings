"use client";

import { useState } from "react";

const STORAGE_KEY = "iyeoba_preferences_v1";

type PreferenceState = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
};

const DEFAULT_PREFERENCES: PreferenceState = {
  essential: true,
  analytics: true,
  marketing: false,
};

export function PreferencesPanel() {
  const [preferences, setPreferences] = useState<PreferenceState>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_PREFERENCES;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(raw) as Partial<PreferenceState>;
      return {
        essential: true,
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });
  const [statusMessage, setStatusMessage] = useState<string>("");

  function handleSave() {
    const payload = {
      essential: true,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setStatusMessage("Preferences saved.");
  }

  return (
    <section className="mt-6 rounded-[1.4rem] border border-[rgba(91,44,131,0.09)] bg-white/90 p-6">
      <PreferenceRow
        title="Essential cookies"
        description="Required for core functionality and security. Always on."
        checked
        disabled
        onChange={() => undefined}
      />
      <PreferenceRow
        title="Analytics cookies"
        description="Help us understand product usage and improve experience."
        checked={preferences.analytics}
        onChange={(checked) =>
          setPreferences((prev) => ({ ...prev, analytics: checked }))
        }
      />
      <PreferenceRow
        title="Marketing cookies"
        description="Used for future campaign and engagement measurement."
        checked={preferences.marketing}
        onChange={(checked) =>
          setPreferences((prev) => ({ ...prev, marketing: checked }))
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSave} className="btn-primary">
          Save Preferences
        </button>
        {statusMessage ? (
          <p className="text-sm text-[color:var(--color-brand-primary)]">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PreferenceRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 border-b border-[rgba(91,44,131,0.08)] py-4 last:border-b-0">
      <div>
        <p className="text-base font-semibold text-[color:var(--color-brand-primary)]">
          {title}
        </p>
        <p className="mt-1 text-sm leading-7 text-[color:var(--color-muted)]">
          {description}
        </p>
      </div>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 rounded border-[rgba(91,44,131,0.35)] text-[color:var(--color-brand-primary)] focus:ring-[color:var(--color-brand-primary)] disabled:opacity-70"
      />
    </label>
  );
}
