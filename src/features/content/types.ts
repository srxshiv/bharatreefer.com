import type { FleetConfig } from "@/config/fleet";
import type { MaterialId, TemperatureBandInfo } from "@/config/materials";
import type { BusinessInfo } from "@/config/site";
import type { Announcement, PageSection, SectionsSetting } from "./sections";

export type Step = { title: string; body: string };
export type Faq = { question: string; answer: string };

export type TruckSizeInfo = {
  capacityKg: number;
  /** Optional model or body name, e.g. "Tata 407". */
  name: string | null;
};

export type FleetPhotoInfo = {
  id: string;
  caption: string;
  width: number;
  height: number;
};

/** A lane shown in the Popular routes section (beta). */
export type RouteInfo = {
  originState: string;
  originCity: string;
  destinationState: string;
  destinationCity: string;
  transitTime: string | null;
  frequency: string | null;
};

/** Page copy with every automatic fallback already resolved. */
export type SiteCopy = {
  heroHeading: string;
  heroIntro: string;
  steps: Step[];
  faqs: Faq[];
};

/** Everything the public site shows. Plain data, so it can be cached and sent to the browser. */
export type SiteContent = {
  business: BusinessInfo;
  fleet: FleetConfig;
  trucks: TruckSizeInfo[];
  bands: Record<MaterialId, TemperatureBandInfo>;
  copy: SiteCopy;
  photos: FleetPhotoInfo[];
  /** Sections below the headline, in page order, including hidden ones. */
  sections: PageSection[];
  /** The three key facts under the headline. */
  showFacts: boolean;
  /** Null when switched off. */
  announcement: Announcement | null;
  routes: RouteInfo[];
};

/** Settings exactly as stored, for the admin forms. */
export type EditableSettings = {
  sections: SectionsSetting;
  announcement: Announcement;
};

/** Which copy fields hold text the business typed, as opposed to the automatic text. */
export type CustomCopy = {
  heroHeading: boolean;
  steps: boolean;
  faqs: boolean;
};
