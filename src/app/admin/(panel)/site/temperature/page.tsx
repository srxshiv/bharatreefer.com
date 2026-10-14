import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { card, input, label } from "@/components/admin/ui";
import { BAND_STYLES } from "@/components/band-styles";
import { MATERIAL_IDS } from "@/config/materials";
import { saveBandsAction } from "@/features/content/actions";
import { getSiteContentForAdmin } from "@/features/content/data";
import { MAX_EXAMPLES } from "@/features/content/schema";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Temperature bands",
};

// Renders complete on the server (one round trip, about 0.2 s): no skeleton flash. The
// progress bar at the top of the panel shows a click was registered.
export const instant = false;

async function BandsForm() {
  const { content } = await getSiteContentForAdmin();

  return (
    <ActionForm action={saveBandsAction} submitLabel="Save temperature bands">
      <p className="mb-6 text-sm text-ink-500">
        The three bands are fixed. You can change how each one is named and described.
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        {MATERIAL_IDS.map((id) => {
          const band = content.bands[id];
          return (
            <section key={id} className={cn(card, "border-t-4 p-6", BAND_STYLES[id].rule)}>
              <h2 className="caption text-ink-500">{id.toLowerCase()}</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor={`band-${id}-label`} className={label}>
                    Name
                  </label>
                  <input
                    id={`band-${id}-label`}
                    name={`${id}.label`}
                    type="text"
                    defaultValue={band.label}
                    maxLength={30}
                    className={`${input} mt-1.5`}
                  />
                </div>
                <div>
                  <label htmlFor={`band-${id}-range`} className={label}>
                    Temperature shown
                  </label>
                  <input
                    id={`band-${id}-range`}
                    name={`${id}.range`}
                    type="text"
                    defaultValue={band.range}
                    maxLength={30}
                    className={`${input} mt-1.5 font-mono`}
                  />
                  <p className="mt-1.5 text-sm text-ink-500">For example &ldquo;−18 to −22 °C&rdquo; or &ldquo;Ambient&rdquo;.</p>
                </div>
                <div>
                  <label htmlFor={`band-${id}-summary`} className={label}>
                    One-line description
                  </label>
                  <textarea
                    id={`band-${id}-summary`}
                    name={`${id}.summary`}
                    defaultValue={band.summary}
                    rows={3}
                    maxLength={200}
                    className={`${input} mt-1.5 h-auto py-2 leading-6`}
                  />
                </div>
                <div>
                  <label htmlFor={`band-${id}-examples`} className={label}>
                    Example cargo
                  </label>
                  <textarea
                    id={`band-${id}-examples`}
                    name={`${id}.examples`}
                    defaultValue={band.examples.join("\n")}
                    rows={4}
                    className={`${input} mt-1.5 h-auto py-2 leading-6`}
                  />
                  <p className="mt-1.5 text-sm text-ink-500">One per line, up to {MAX_EXAMPLES}.</p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </ActionForm>
  );
}

export default function TemperaturePage() {
  return <BandsForm />;
}
