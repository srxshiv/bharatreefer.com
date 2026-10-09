import { Hero } from "@/components/site/hero";
import { Contact, Faq, Fleet, TemperatureBands } from "@/components/site/sections";
import { site, siteUrl } from "@/config/site";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: site.name,
  description: site.description,
  url: siteUrl,
  telephone: site.phone.e164,
  email: site.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.address.street,
    addressLocality: site.address.city,
    addressRegion: site.address.region,
    addressCountry: site.address.country,
  },
  areaServed: { "@type": "Country", name: "India" },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: site.hours.days,
    opens: site.hours.opens,
    closes: site.hours.closes,
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Hero />
      <TemperatureBands />
      <Fleet />
      <Faq />
      <Contact />
    </>
  );
}
