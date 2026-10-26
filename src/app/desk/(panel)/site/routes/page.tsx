import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { ActionForm } from "@/components/admin/action-form";
import { ListEditor } from "@/components/admin/list-editor";
import { card } from "@/components/admin/ui";
import { REGION_NAMES } from "@/data/india-locations";
import { saveRoutesAction } from "@/features/content/actions";
import { MAX_ROUTES, getSiteContentForAdmin } from "@/features/content/data";

export const metadata: Metadata = {
  title: "Routes",
};

// Renders complete on the server (one round trip): no skeleton flash.
export const instant = false;

export default async function RoutesPage() {
  const { content } = await getSiteContentForAdmin();
  const section = content.sections.find((item) => item.id === "routes");

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-saffron-400/40 bg-saffron-50 p-4">
        <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-saffron-600" />
        <div className="text-sm text-ink-700">
          <p className="font-semibold text-ink-950">Routes is in beta</p>
          <p className="mt-1">
            List the lanes you run often. On the website each one becomes a card that starts a quote with the route
            filled in.{" "}
            {section?.visible ? (
              <>The Popular routes section is <strong>on</strong>.</>
            ) : (
              <>
                The Popular routes section is <strong>off</strong>. Switch it on in{" "}
                <Link href="/desk/site/sections" className="font-semibold text-ice-700 underline underline-offset-4">
                  Sections
                </Link>{" "}
                when the list is ready.
              </>
            )}
          </p>
        </div>
      </div>

      <ActionForm action={saveRoutesAction} submitLabel="Save routes">
        <section className={`${card} p-6`}>
          <h2 className="font-sans text-base font-semibold text-ink-950">Routes</h2>
          <p className="mt-1 text-sm text-ink-500">Shown in this order. Up to {MAX_ROUTES}.</p>
          <div className="mt-4">
            <ListEditor
              prefix="routes"
              max={MAX_ROUTES}
              sortable
              initial={content.routes.map((route) => ({
                originState: route.originState,
                originCity: route.originCity,
                destinationState: route.destinationState,
                destinationCity: route.destinationCity,
                transitTime: route.transitTime ?? "",
                frequency: route.frequency ?? "",
              }))}
              addLabel="Add a route"
              emptyLabel="No routes yet."
              rowLabel="route"
              fields={[
                { name: "originState", label: "From state", kind: "select", options: REGION_NAMES, placeholder: "Choose a state" },
                { name: "originCity", label: "From city", maxLength: 60, placeholder: "e.g. Ludhiana" },
                { name: "destinationState", label: "To state", kind: "select", options: REGION_NAMES, placeholder: "Choose a state" },
                { name: "destinationCity", label: "To city", maxLength: 60, placeholder: "e.g. Mumbai" },
                { name: "transitTime", label: "Transit time (optional)", maxLength: 40, placeholder: "e.g. 48 to 60 hours" },
                { name: "frequency", label: "How often (optional)", maxLength: 40, placeholder: "e.g. Daily departures" },
              ]}
            />
          </div>
        </section>
      </ActionForm>
    </div>
  );
}
