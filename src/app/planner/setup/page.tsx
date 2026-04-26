import { MainNav } from "@/components/main-nav";
import { savePlannerOverviewAction } from "@/app/planner/actions";
import { requirePlannerProfile } from "@/lib/auth";
import { budgetRanges, cultures, locations, weddingTypes } from "@/lib/planner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PlannerSetupPage(props: { searchParams: SearchParams }) {
  const profile = await requirePlannerProfile("/planner/setup");
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const ownerId = await resolvePlannerOwnerIdForSetup(supabase, profile.id);
  const message =
    typeof searchParams.message === "string" ? searchParams.message : undefined;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;

  const { data: weddings } = await supabase
    .from("weddings")
    .select("culture, wedding_type, location, guest_count, budget_range")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false });
  const weddingOverview = Array.isArray(weddings) ? weddings[0] ?? null : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(106,62,124,0.12),_transparent_38%),linear-gradient(180deg,#ffffff_0%,#fdfbfd_45%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-12">
        <section className="surface-card rounded-[2rem] p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
            Planner setup
          </p>
          <h1 className="font-display mt-4 text-5xl leading-none text-[color:var(--color-ink)]">
            Start with the essentials.
          </h1>
          <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
            Keep this lightweight. Planner is a private support feature for
            signed-in planner users, not the main public product story.
          </p>

          <div className="mt-8 grid gap-4">
            <FeatureTile
              title="Planning-first"
              body="The flow begins with the wedding, not the marketplace."
            />
            <FeatureTile
              title="Soft guidance"
              body="The dashboard will turn these answers into a calm planning workspace."
            />
            <FeatureTile
              title="Vendor discovery later"
              body="Suggested categories and vendor matches appear once planning starts."
            />
          </div>
        </section>

        <section className="surface-card rounded-[2rem] p-8 shadow-[0_32px_90px_-42px_rgba(106,62,124,0.22)]">
          {message ? (
            <p className="mb-4 rounded-[1.1rem] border border-[rgba(106,62,124,0.2)] bg-[rgba(106,62,124,0.08)] px-4 py-2 text-sm text-[color:var(--color-brand-primary)]">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mb-4 rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <form
            action={savePlannerOverviewAction}
            className="grid gap-5 md:grid-cols-2"
          >
            <input type="hidden" name="nextPath" value="/planner/dashboard" />
            <SelectField
              name="culture"
              label="Culture"
              options={cultures}
              placeholder="Select culture"
              defaultValue={weddingOverview?.culture ?? ""}
            />
            <SelectField
              name="weddingType"
              label="Wedding type"
              options={weddingTypes}
              placeholder="Select wedding type"
              defaultValue={weddingOverview?.wedding_type ?? ""}
            />
            <SelectField
              name="location"
              label="Location"
              options={locations}
              placeholder="Select location"
              defaultValue={weddingOverview?.location ?? ""}
            />
            <Field
              name="guestCount"
              label="Guest count"
              placeholder="e.g. 250"
              type="number"
              defaultValue={
                typeof weddingOverview?.guest_count === "number"
                  ? String(weddingOverview.guest_count)
                  : ""
              }
            />
            <div className="md:col-span-2">
              <SelectField
                name="budgetRange"
                label="Budget range"
                options={budgetRanges}
                placeholder="Select budget range"
                defaultValue={weddingOverview?.budget_range ?? ""}
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                className="btn-primary"
              >
                Save and open planner
              </button>
              <p className="text-sm leading-7 text-[color:var(--color-muted)]">
                You can refine details later. This is the lean MVP version of the
                planning flow.
              </p>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

function FeatureTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface-soft rounded-[1.5rem] p-5">
      <h2 className="font-display text-2xl text-[color:var(--color-ink)]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
        {body}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      {label}
      <input
        type={type}
        min={1}
        name={name}
        required
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="field-input rounded-[1.25rem]"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      {label}
      <select
        name={name}
        required
        defaultValue={defaultValue || ""}
        className="field-input rounded-[1.25rem]"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

async function resolvePlannerOwnerIdForSetup(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  fallbackId: string,
) {
  const { data, error } = await supabase.auth.getUser();
  const authUserId = data.user?.id ?? null;

  if (error) {
    console.error("Planner setup auth owner resolution failed", {
      fallbackId,
      error: {
        message: error.message ?? null,
      },
    });
    return fallbackId;
  }

  return authUserId || fallbackId;
}
