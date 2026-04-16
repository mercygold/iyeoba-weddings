import { MainNav } from "@/components/main-nav";
import { requirePlannerProfile } from "@/lib/auth";
import { budgetRanges, cultures, locations, weddingTypes } from "@/lib/planner";

export default async function PlannerSetupPage() {
  await requirePlannerProfile("/planner/setup");

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
          <form
            action="/planner/dashboard"
            method="get"
            className="grid gap-5 md:grid-cols-2"
          >
            <SelectField
              name="culture"
              label="Culture"
              options={cultures}
              placeholder="Select culture"
            />
            <SelectField
              name="weddingType"
              label="Wedding type"
              options={weddingTypes}
              placeholder="Select wedding type"
            />
            <SelectField
              name="location"
              label="Location"
              options={locations}
              placeholder="Select location"
            />
            <Field
              name="guestCount"
              label="Guest count"
              placeholder="e.g. 250"
              type="number"
            />
            <div className="md:col-span-2">
              <SelectField
                name="budgetRange"
                label="Budget range"
                options={budgetRanges}
                placeholder="Select budget range"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                className="btn-primary"
              >
                Open Planner
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
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
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
}: {
  label: string;
  name: string;
  options: string[];
  placeholder: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      {label}
      <select
        name={name}
        required
        defaultValue=""
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
