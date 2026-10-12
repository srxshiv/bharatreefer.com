import { Home } from "@/components/console/home";
import { siteUrl } from "@/config/site";
import { getSiteContent } from "@/features/content/data";

export default async function HomePage() {
  const content = await getSiteContent();
  const { business, copy } = content;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: copy.heroIntro,
    url: siteUrl,
    logo: `${siteUrl}/brand/logo.webp`,
    telephone: business.phone,
    email: business.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.region,
      addressCountry: "IN",
    },
    areaServed: { "@type": "Country", name: "India" },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: business.hours.days,
      opens: business.hours.opens,
      closes: business.hours.closes,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Home content={content} />
    </>
  );
}
