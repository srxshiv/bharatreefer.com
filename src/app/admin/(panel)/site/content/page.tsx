import { Suspense } from "react";
import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { AutomaticToggle } from "@/components/admin/automatic-toggle";
import { ListEditor } from "@/components/admin/list-editor";
import { card, input, label } from "@/components/admin/ui";
import { saveCopyAction } from "@/features/content/actions";
import { automaticFaqs, automaticHeading, automaticSteps } from "@/features/content/automatic";
import { readSiteContent } from "@/features/content/data";
import { MAX_FAQS, MAX_STEPS } from "@/features/content/schema";

export const metadata: Metadata = {
  title: "Page text",
};

const sectionTitle = "font-sans text-base font-semibold text-ink-950";

async function CopyForm() {
  const { content, custom } = await readSiteContent();
  const { copy, business, fleet } = content;
  const autoSteps = automaticSteps(business);
  const autoFaqs = automaticFaqs(business, fleet);

  return (
    <ActionForm action={saveCopyAction} submitLabel="Save page text">
      <div className="space-y-6">
        <section className={`${card} p-6`}>
          <h2 className={sectionTitle}>Headline</h2>
          <p className="mt-1 text-sm text-ink-500">
            The first thing a visitor reads. The automatic version follows your truck sizes.
          </p>
          <div className="mt-4">
            <AutomaticToggle
              name="automaticHeading"
              initiallyAutomatic={!custom.heroHeading}
              preview={<p className="font-semibold text-ink-950">{automaticHeading(fleet)}</p>}
            >
              <div>
                <label htmlFor="copy-heading" className={label}>
                  Headline
                </label>
                <input
                  id="copy-heading"
                  name="heroHeading"
                  type="text"
                  defaultValue={custom.heroHeading ? copy.heroHeading : ""}
                  maxLength={120}
                  className={`${input} mt-1.5`}
                />
              </div>
            </AutomaticToggle>
          </div>
          <div className="mt-5">
            <label htmlFor="copy-intro" className={label}>
              Introduction
            </label>
            <textarea
              id="copy-intro"
              name="heroIntro"
              defaultValue={copy.heroIntro}
              rows={3}
              maxLength={300}
              className={`${input} mt-1.5 h-auto py-2.5 leading-6`}
            />
            <p className="mt-1.5 text-sm text-ink-500">One or two sentences, up to 300 characters.</p>
          </div>
        </section>

        <section className={`${card} p-6`}>
          <h2 className={sectionTitle}>How it works</h2>
          <p className="mt-1 text-sm text-ink-500">The short steps shown next to the quote form.</p>
          <div className="mt-4">
            <AutomaticToggle
              name="automaticSteps"
              initiallyAutomatic={!custom.steps}
              preview={
                <ol className="list-decimal space-y-2 pl-5">
                  {autoSteps.map((step) => (
                    <li key={step.title}>
                      <span className="font-semibold text-ink-950">{step.title}.</span> {step.body}
                    </li>
                  ))}
                </ol>
              }
            >
              <ListEditor
                prefix="steps"
                max={MAX_STEPS}
                initial={custom.steps ? copy.steps : autoSteps}
                addLabel="Add a step"
                emptyLabel="No steps yet."
                rowLabel="step"
                fields={[
                  { name: "title", label: "Title", maxLength: 60 },
                  { name: "body", label: "Detail", kind: "textarea", maxLength: 200 },
                ]}
              />
            </AutomaticToggle>
          </div>
        </section>

        <section className={`${card} p-6`}>
          <h2 className={sectionTitle}>Questions and answers</h2>
          <p className="mt-1 text-sm text-ink-500">
            The automatic answers quote your weight limits, hours and phone number, so they stay correct when those change.
          </p>
          <div className="mt-4">
            <AutomaticToggle
              name="automaticFaqs"
              initiallyAutomatic={!custom.faqs}
              preview={
                <dl className="space-y-3">
                  {autoFaqs.map((faq) => (
                    <div key={faq.question}>
                      <dt className="font-semibold text-ink-950">{faq.question}</dt>
                      <dd>{faq.answer}</dd>
                    </div>
                  ))}
                </dl>
              }
            >
              <ListEditor
                prefix="faqs"
                max={MAX_FAQS}
                initial={custom.faqs ? copy.faqs : autoFaqs}
                addLabel="Add a question"
                emptyLabel="No questions. The section is hidden on the site."
                rowLabel="question"
                fields={[
                  { name: "question", label: "Question", maxLength: 120 },
                  { name: "answer", label: "Answer", kind: "textarea", maxLength: 600 },
                ]}
              />
            </AutomaticToggle>
          </div>
        </section>
      </div>
    </ActionForm>
  );
}

export default function ContentPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-frost-100" />}>
      <CopyForm />
    </Suspense>
  );
}
