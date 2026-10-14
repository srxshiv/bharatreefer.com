import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Globe, Inbox, MessageCircle, ShieldCheck, Snowflake } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/site/logo";
import { ADMIN_HOME } from "@/features/auth/cookie";
import { getAdmin } from "@/features/auth/session";
import { getSiteContent } from "@/features/content/data";

export const metadata: Metadata = {
  title: "Sign in",
};

const FEATURES = [
  {
    Icon: Inbox,
    title: "Every request in one inbox",
    body: "Route, cargo, weight and the suggested truck, the moment a customer sends it.",
  },
  {
    Icon: MessageCircle,
    title: "Reply in one tap",
    body: "Call or WhatsApp the customer with the details already written for you.",
  },
  {
    Icon: Globe,
    title: "Run the website yourself",
    body: "Hours, trucks, photos and page text. Changes go live as soon as you save.",
  },
];

/** Skips the form for someone who is already signed in. */
async function RedirectIfSignedIn() {
  if (await getAdmin()) redirect(ADMIN_HOME);
  return null;
}

/** A dashed route between two depots, drawn faintly behind the brand panel's text. */
function RouteArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 600"
      className="pointer-events-none absolute -right-20 -bottom-32 w-[24rem] text-ice-300 opacity-[0.14]"
      fill="none"
    >
      <path
        d="M40 520 C 160 500, 180 360, 300 330 S 470 240, 540 80"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 10"
        strokeLinecap="round"
      />
      <circle cx="40" cy="520" r="9" fill="currentColor" />
      <circle cx="540" cy="80" r="9" fill="currentColor" />
      <circle cx="540" cy="80" r="22" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default async function LoginPage() {
  const { business } = await getSiteContent();

  return (
    <main className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      {/* Brand panel */}
      <section
        aria-label={`About the ${business.name} admin panel`}
        className="login-panel relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
      >
        <div aria-hidden="true" className="dot-grid absolute inset-0" />
        <Snowflake
          aria-hidden="true"
          strokeWidth={0.6}
          className="pointer-events-none absolute -top-24 -right-24 size-[26rem] text-white/[0.05]"
        />
        <RouteArt />

        <p className="relative inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-sm text-ice-200 backdrop-blur-sm">
          <Snowflake aria-hidden="true" className="size-4 text-ice-300" />
          {business.name} dispatch desk
        </p>

        <div className="relative max-w-lg">
          <h2 className="text-4xl/[1.15] font-semibold tracking-tight xl:text-[2.75rem]/[1.12]">
            Every quote request,
            <br />
            <span className="text-ice-300">ready to work.</span>
          </h2>
          <p className="mt-5 max-w-md text-lg leading-8 text-ice-100/80">
            The admin panel for {business.name}: see new requests as they arrive, follow up with
            customers and keep the website current.
          </p>

          <ul className="mt-12 space-y-6">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm">
                  <feature.Icon aria-hidden="true" className="size-5 text-ice-300" />
                </span>
                <div>
                  <p className="font-medium text-white">{feature.title}</p>
                  <p className="mt-1 text-sm leading-6 text-ice-100/70">{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between gap-6 text-sm text-ice-100/60">
          <p>
            {business.name} · {business.tagline}
          </p>
          <span aria-hidden="true" className="tricolour h-1 w-16 rounded-full" />
        </div>
      </section>

      {/* Sign-in panel */}
      <section className="flex flex-col bg-white px-6 py-6 sm:px-10 lg:px-14">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-ink-500 transition-colors hover:text-navy-900"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to website
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <Logo name={business.name} priority className="h-16 lg:h-[4.5rem]" />

          <h1 className="mt-10 text-3xl/tight font-semibold tracking-tight text-navy-950">
            Welcome back
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-ink-500">
            Sign in to manage quote requests and the website.
          </p>

          <LoginForm className="mt-8" />

          <p className="mt-8 border-t border-frost-200 pt-6 text-sm leading-6 text-ink-500">
            Forgot your password? Ask whoever looks after this website to reset it for you.
          </p>
        </div>

        <p className="flex items-center justify-center gap-2 text-xs text-ink-400">
          <ShieldCheck aria-hidden="true" className="size-4" />
          Secure sign-in. Repeated wrong passwords are blocked for 15 minutes.
        </p>
      </section>
    </main>
  );
}
