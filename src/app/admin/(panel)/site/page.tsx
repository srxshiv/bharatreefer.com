import { Suspense } from "react";
import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { card, input, label } from "@/components/admin/ui";
import { saveBusinessAction } from "@/features/content/actions";
import { readSiteContent } from "@/features/content/data";
import { DAY_NAMES } from "@/lib/hours";
import { formatIndianMobile } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Business details",
};

const sectionTitle = "font-sans text-base font-semibold text-ink-950";
const hint = "mt-1.5 text-sm text-ink-500";

function Field({
  id,
  name,
  title,
  value,
  type = "text",
  autoComplete,
  maxLength,
  help,
  mono,
}: {
  id: string;
  name: string;
  title: string;
  value: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  help?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {title}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={value}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className={`${input} mt-1.5${mono ? " font-mono" : ""}`}
      />
      {help ? <p className={hint}>{help}</p> : null}
    </div>
  );
}

async function BusinessForm() {
  const { content } = await readSiteContent();
  const { business } = content;

  return (
    <ActionForm action={saveBusinessAction} submitLabel="Save business details">
      <div className="space-y-6">
        <section className={`${card} p-6`}>
          <h2 className={sectionTitle}>Name and contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="biz-name" name="name" title="Business name" value={business.name} maxLength={60} />
            <Field
              id="biz-tagline"
              name="tagline"
              title="Tagline"
              value={business.tagline}
              maxLength={80}
              help="One short line under the name."
            />
            <Field
              id="biz-phone"
              name="phone"
              title="Phone"
              value={formatIndianMobile(business.phone)}
              type="tel"
              autoComplete="tel"
              mono
              help="10-digit Indian mobile. Shown everywhere on the site."
            />
            <Field
              id="biz-whatsapp"
              name="whatsapp"
              title="WhatsApp number"
              value={business.whatsapp ? formatIndianMobile(business.whatsapp) : ""}
              type="tel"
              mono
              help="Leave empty to hide the WhatsApp buttons."
            />
            <Field
              id="biz-email"
              name="email"
              title="Public email"
              value={business.email}
              type="email"
              autoComplete="email"
              help="Shown on the site."
            />
            <Field
              id="biz-alert"
              name="alertEmail"
              title="Alerts go to"
              value={business.alertEmail ?? ""}
              type="email"
              help="Where new-request emails are sent. Leave empty to use the public email."
            />
            <Field
              id="biz-response"
              name="responseTime"
              title="Reply time promised"
              value={business.responseTime}
              maxLength={40}
              help='For example "24 hours" or "one working day".'
            />
          </div>
        </section>

        <section className={`${card} p-6`}>
          <h2 className={sectionTitle}>Address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field id="biz-street" name="addressStreet" title="Street or area" value={business.address.street} maxLength={80} />
            <Field id="biz-city" name="addressCity" title="City" value={business.address.city} maxLength={60} />
            <Field id="biz-region" name="addressRegion" title="State" value={business.address.region} maxLength={60} />
          </div>
        </section>

        <section className={`${card} p-6`}>
          <h2 className={sectionTitle}>Desk hours</h2>
          <p className={hint}>
            The site shows whether the desk is open right now, in India time.
          </p>
          <fieldset className="mt-4">
            <legend className={label}>Days open</legend>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {DAY_NAMES.map((day) => (
                <label key={day} className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-900">
                  <input
                    type="checkbox"
                    name="hoursDays"
                    value={day}
                    defaultChecked={business.hours.days.includes(day)}
                    className="size-4 rounded border-frost-300"
                  />
                  {day}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 grid max-w-sm grid-cols-2 gap-4">
            <Field id="biz-open" name="hoursOpen" title="Opens" value={business.hours.opens} type="time" mono />
            <Field id="biz-close" name="hoursClose" title="Closes" value={business.hours.closes} type="time" mono />
          </div>
        </section>
      </div>
    </ActionForm>
  );
}

export default function BusinessPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-frost-100" />}>
      <BusinessForm />
    </Suspense>
  );
}
