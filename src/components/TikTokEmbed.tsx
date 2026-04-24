"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

type TikTokEmbedProps = {
  url: string;
  title?: string;
};

const TIKTOK_SCRIPT_ID = "tiktok-embed-script";

export function TikTokEmbed({ url, title = "Wedding inspiration" }: TikTokEmbedProps) {
  const videoId = useMemo(() => extractTikTokVideoId(url), [url]);
  const hasEmbeddableVideo = Boolean(videoId);

  useEffect(() => {
    if (!hasEmbeddableVideo) return;

    if (document.getElementById(TIKTOK_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = TIKTOK_SCRIPT_ID;
    script.src = "https://www.tiktok.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
  }, [hasEmbeddableVideo]);

  if (!hasEmbeddableVideo) {
    return (
      <article className="rounded-2xl border border-[rgba(91,44,131,0.1)] bg-white/92 p-5 shadow-[0_20px_46px_-38px_rgba(106,62,124,0.24)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-brand-primary)]">
          TikTok inspiration
        </p>
        <h3 className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
          View this wedding inspiration on TikTok.
        </p>
        <Link
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex whitespace-nowrap rounded-full border border-[#5B2C83] bg-white px-4 py-2 text-sm font-semibold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[#5B2C83] hover:text-white"
        >
          Open on TikTok
        </Link>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-[rgba(91,44,131,0.1)] bg-white/92 p-3 shadow-[0_20px_46px_-38px_rgba(106,62,124,0.24)]">
      <blockquote
        className="tiktok-embed"
        cite={url}
        data-video-id={videoId ?? undefined}
        style={{ margin: 0, minWidth: "100%", maxWidth: "100%" }}
      >
        <section>
          <a href={url} target="_blank" rel="noreferrer">
            View this wedding inspiration on TikTok
          </a>
        </section>
      </blockquote>
    </article>
  );
}

function extractTikTokVideoId(url: string) {
  const match = url.match(/\/(?:video|photo)\/(\d+)/i);
  return match?.[1] ?? null;
}
