import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { ListEditor } from "@/components/admin/list-editor";
import { PhotoControls } from "@/components/admin/photo-controls";
import { card, input, label } from "@/components/admin/ui";
import { saveFleetAction, updateFleetPhotoCaptionAction, uploadFleetPhotoAction } from "@/features/content/actions";
import { MAX_FLEET_PHOTOS, getSiteContentForAdmin } from "@/features/content/data";
import { MAX_TRUCK_SIZES } from "@/features/content/schema";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Fleet and photos",
};

// Renders complete on the server (one round trip, about 0.2 s): no skeleton flash. The
// progress bar at the top of the panel shows a click was registered.
export const instant = false;

const sectionTitle = "font-sans text-base font-semibold text-ink-950";

async function FleetForms() {
  const { content } = await getSiteContentForAdmin();
  const { trucks, fleet, photos } = content;

  return (
    <div className="space-y-6">
      <ActionForm action={saveFleetAction} submitLabel="Save fleet">
        <div className="space-y-6">
          <section className={`${card} p-6`}>
            <h2 className={sectionTitle}>Truck sizes</h2>
            <p className="mt-1 text-sm text-ink-500">
              Payload per truck. The quote form picks the smallest size that carries the load, so list every size you run.
            </p>
            <div className="mt-4">
              <ListEditor
                prefix="trucks"
                max={MAX_TRUCK_SIZES}
                initial={trucks.map((truck) => ({ capacityKg: String(truck.capacityKg), name: truck.name ?? "" }))}
                addLabel="Add a truck size"
                emptyLabel="No truck sizes. Add at least one."
                rowLabel="truck size"
                fields={[
                  { name: "capacityKg", label: "Payload (kg)", kind: "number", min: 100, max: 60_000, width: "sm:max-w-44" },
                  { name: "name", label: "Model or body (optional)", maxLength: 40, placeholder: "e.g. Tata 407" },
                ]}
              />
            </div>
          </section>

          <section className={`${card} p-6`}>
            <h2 className={sectionTitle}>Load limits</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="fleet-min" className={label}>
                  Smallest load (kg)
                </label>
                <input id="fleet-min" name="minQuantityKg" type="number" inputMode="numeric" min={1} defaultValue={fleet.minQuantityKg} className={cn(input, "mt-1.5 font-mono")} />
              </div>
              <div>
                <label htmlFor="fleet-max" className={label}>
                  Largest load per request (kg)
                </label>
                <input id="fleet-max" name="maxQuantityKg" type="number" inputMode="numeric" min={1} max={200_000} defaultValue={fleet.maxQuantityKg} className={cn(input, "mt-1.5 font-mono")} />
              </div>
              <div>
                <label htmlFor="fleet-fill" className={label}>
                  Dedicated truck from (% full)
                </label>
                <input id="fleet-fill" name="dedicatedFillPercent" type="number" inputMode="numeric" min={1} max={100} defaultValue={Math.round(fleet.dedicatedFill * 100)} className={cn(input, "mt-1.5 font-mono")} />
                <p className="mt-1.5 text-sm text-ink-500">
                  Lighter loads are suggested as part loads.
                </p>
              </div>
            </div>
          </section>
        </div>
      </ActionForm>

      <section className={`${card} p-6`}>
        <h2 className={sectionTitle}>Photos</h2>
        <p className="mt-1 text-sm text-ink-500">
          Real photos of your trucks, shown on the public site. Up to {MAX_FLEET_PHOTOS}. Photos are resized automatically.
        </p>

        <ActionForm
          action={uploadFleetPhotoAction}
          submitLabel="Add photo"
          pendingLabel="Uploading"
          encType="multipart/form-data"
          className="mt-4"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            <div>
              <label htmlFor="photo-file" className={label}>
                Photo
              </label>
              <input
                id="photo-file"
                name="photo"
                type="file"
                accept="image/*"
                required
                className="mt-1.5 block w-full text-sm text-ink-700 file:mr-3 file:h-11 file:rounded-lg file:border file:border-frost-300 file:bg-white file:px-4 file:text-sm file:font-semibold file:text-ink-950"
              />
              <p className="mt-1.5 text-sm text-ink-500">JPEG, PNG, WebP or HEIC, under 6 MB.</p>
            </div>
            <div>
              <label htmlFor="photo-caption" className={label}>
                Caption
              </label>
              <input id="photo-caption" name="caption" type="text" required minLength={2} maxLength={120} placeholder="e.g. 16 t reefer, Mumbai run" className={`${input} mt-1.5`} />
            </div>
          </div>
        </ActionForm>

        {photos.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo, index) => (
              <li key={photo.id} className="overflow-hidden rounded-lg border border-frost-200">
                {/* eslint-disable-next-line @next/next/no-img-element -- served from our own database, not an optimisable asset */}
                <img
                  src={`/media/fleet/${photo.id}`}
                  alt={photo.caption}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  className="aspect-[4/3] w-full bg-frost-100 object-cover"
                />
                <div className="space-y-3 p-3">
                  <ActionForm
                    action={updateFleetPhotoCaptionAction.bind(null, photo.id)}
                    submitLabel="Save caption"
                  >
                    <label htmlFor={`caption-${photo.id}`} className="sr-only">
                      Caption
                    </label>
                    <input id={`caption-${photo.id}`} name="caption" type="text" defaultValue={photo.caption} maxLength={120} className={input} />
                  </ActionForm>
                  <PhotoControls id={photo.id} caption={photo.caption} first={index === 0} last={index === photos.length - 1} />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

export default function FleetPage() {
  return <FleetForms />;
}
