import type { Metadata, Viewport } from "next";
import { DM_Mono, Instrument_Sans } from "next/font/google";
import { SiteProvider } from "@/components/site/site-context";
import { DEFAULT_THEME, THEME_COLORS, THEME_SCRIPT } from "@/components/site/theme";
import { siteUrl } from "@/config/site";
import { getSiteContent } from "@/features/content/data";
import "./globals.css";

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const mono = DM_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { business, copy } = await getSiteContent();
  const title = `${business.name} | ${copy.heroHeading.replace(/\.$/, "")}`;
  const description = `${copy.heroIntro} Reply within ${business.responseTime}.`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${business.name}`,
    },
    description,
    applicationName: business.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: business.name,
      locale: "en_IN",
      url: "/",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const viewport: Viewport = {
  themeColor: THEME_COLORS.light,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { business } = await getSiteContent();

  return (
    <html
      lang="en-IN"
      // Tells Next.js to skip the CSS smooth scrolling when it changes route.
      data-scroll-behavior="smooth"
      // Served light; the script below switches to the visitor's saved theme before paint,
      // which React would otherwise report as a mismatch.
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
      className={`${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteProvider business={business}>{children}</SiteProvider>
      </body>
    </html>
  );
}
