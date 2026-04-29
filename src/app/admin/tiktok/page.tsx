import { MainNav } from "@/components/main-nav";
import {
  addTikTokVideoAction,
  removeTikTokVideoAction,
  syncTikTokNowAction,
} from "@/app/admin/tiktok/actions";
import { requireAdminProfile } from "@/lib/auth";
import { getTikTokVideos } from "@/lib/tiktok";

type SearchParams = Promise<{ message?: string }>;

export default async function AdminTikTokPage(props: {
  searchParams: SearchParams;
}) {
  await requireAdminProfile("/admin/tiktok");
  const searchParams = await props.searchParams;
  const videos = await getTikTokVideos();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdfbfd_0%,#ffffff_52%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
        <section className="surface-card rounded-[2rem] p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
            Admin
          </p>
          <h1 className="font-display mt-3 text-4xl text-[color:var(--color-ink)]">
            TikTok content control
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--color-muted)]">
            Add or remove TikTok video links, tag content by category, and mark
            featured videos for homepage or the TikTok landing page.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href="/api/tiktok/connect"
              className="btn-secondary px-5 py-2.5"
            >
              Connect TikTok Account
            </a>
            <form action={syncTikTokNowAction}>
              <button
                type="submit"
                className="btn-primary px-5 py-2.5"
              >
                Sync TikTok Now
              </button>
            </form>
          </div>
          {searchParams.message ? (
            <p className="surface-soft mt-4 rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-brand-primary)]">
              {searchParams.message}
            </p>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form
            action={addTikTokVideoAction}
            className="surface-card rounded-[2rem] p-7"
          >
            <h2 className="font-display text-3xl text-[color:var(--color-ink)]">
              Add TikTok video
            </h2>
            <div className="mt-5 grid gap-4">
              <Field label="Post ID" name="postId" />
              <Field label="Share URL" name="shareUrl" />
              <Field
                label="Title"
                name="title"
                placeholder="Short card title for fallback previews"
                required={false}
              />
              <Field
                label="Thumbnail URL"
                name="thumbnailUrl"
                placeholder="Optional cover image URL"
                required={false}
              />
              <Field label="Caption" name="caption" />
              <Field label="Category" name="category" />
              <Field
                label="Vendor Slug"
                name="vendorSlug"
                placeholder="Optional vendor social proof link"
                required={false}
              />
              <label className="flex items-center gap-3 text-sm font-medium text-[color:var(--color-ink)]">
                <input type="checkbox" name="featuredHome" />
                Feature on homepage
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-[color:var(--color-ink)]">
                <input type="checkbox" name="featuredLanding" />
                Feature on `/from-tiktok`
              </label>
              <button
                type="submit"
                className="btn-primary"
              >
                Save video
              </button>
            </div>
          </form>

          <div className="surface-card rounded-[2rem] p-7">
            <h2 className="font-display text-3xl text-[color:var(--color-ink)]">
              Existing videos
            </h2>
            <div className="mt-5 grid gap-4">
              {videos.map((video) => (
                <div
                  key={video.postId}
                  className="surface-card rounded-[1.5rem] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-brand-gold)]">
                        {video.category}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
                        {video.caption}
                      </p>
                    </div>
                    <form action={removeTikTokVideoAction}>
                      <input type="hidden" name="postId" value={video.postId} />
                      <button
                        type="submit"
                        className="btn-secondary px-4 py-2"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {video.featuredHome ? <Chip label="Homepage" /> : null}
                    {video.featuredLanding ? <Chip label="TikTok Landing" /> : null}
                    {video.vendorSlug ? (
                      <Chip label={`Vendor: ${video.vendorSlug}`} />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required = true,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="field-input rounded-[1.25rem]"
      />
    </label>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="surface-soft rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--color-brand-primary)]">
      {label}
    </span>
  );
}
