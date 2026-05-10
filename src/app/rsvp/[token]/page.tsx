import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<{ response?: string }>;

export const dynamic = "force-dynamic";

export default async function RsvpPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { token } = await props.params;
  const searchParams = await props.searchParams;
  const response = searchParams.response === "declined" ? "declined" : "confirmed";
  const admin = createSupabaseAdminClient();
  let saved = false;
  let coupleName = "the couple";

  if (admin && token) {
    const { data } = await admin
      .from("guest_invites")
      .update({ rsvp_status: response })
      .eq("rsvp_token", token)
      .select("couple_name")
      .maybeSingle();

    saved = Boolean(data);
    coupleName = data?.couple_name || coupleName;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAF9F7_0%,#ffffff_58%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-12 sm:px-6">
        <section className="surface-card w-full rounded-[2rem] p-6 text-center sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
            RSVP response
          </p>
          <h1 className="mt-4 font-display text-3xl text-[color:var(--color-ink)] sm:text-5xl">
            {saved ? "Thank you, your response has been recorded." : "We could not record this RSVP."}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[color:var(--color-muted)] sm:text-base">
            {saved
              ? `Your ${response === "confirmed" ? "confirmation" : "decline"} has been shared with ${coupleName}.`
              : "This RSVP link may be invalid or expired. Please contact the couple or planner directly."}
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex px-5 py-2.5 text-sm">
            Back to Iyeoba Weddings
          </Link>
        </section>
      </main>
    </div>
  );
}
