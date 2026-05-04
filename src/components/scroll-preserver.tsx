"use client";

import { useEffect } from "react";

const STORAGE_KEY = "iyeoba:same-page-action-scroll";
const RESTORE_WINDOW_MS = 8000;

type SavedScroll = {
  pathname: string;
  y: number;
  expiresAt: number;
};

function readSavedScroll(): SavedScroll | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SavedScroll>;
    if (
      typeof parsed.pathname !== "string" ||
      typeof parsed.y !== "number" ||
      typeof parsed.expiresAt !== "number"
    ) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (Date.now() > parsed.expiresAt) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed as SavedScroll;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveCurrentScroll() {
  try {
    const value: SavedScroll = {
      pathname: window.location.pathname,
      y: window.scrollY,
      expiresAt: Date.now() + RESTORE_WINDOW_MS,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Scroll preservation is a UX enhancement; storage failures should not block actions.
  }
}

function restoreSavedScroll() {
  const saved = readSavedScroll();
  if (!saved) {
    return;
  }

  if (saved.pathname !== window.location.pathname) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.scrollTo({ top: saved.y, behavior: "auto" });
  window.sessionStorage.removeItem(STORAGE_KEY);
}

function restoreAcrossNextRender() {
  const startedAt = Date.now();

  const tick = () => {
    const saved = readSavedScroll();
    if (!saved) {
      return;
    }

    if (saved.pathname !== window.location.pathname) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    const scrollWasReset = saved.y > 80 && window.scrollY <= 80;
    if (scrollWasReset) {
      window.scrollTo({ top: saved.y, behavior: "auto" });
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (Date.now() - startedAt < RESTORE_WINDOW_MS) {
      window.requestAnimationFrame(tick);
      return;
    }

    window.sessionStorage.removeItem(STORAGE_KEY);
  };

  window.requestAnimationFrame(tick);
}

export function ScrollPreserver() {
  useEffect(() => {
    restoreSavedScroll();

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      if (form.dataset.preserveScroll === "false") {
        return;
      }

      saveCurrentScroll();
      restoreAcrossNextRender();
    };

    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}
