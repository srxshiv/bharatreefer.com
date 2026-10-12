import type { FleetConfig } from "@/config/fleet";
import type { MaterialId, TemperatureBandInfo } from "@/config/materials";
import type { BusinessInfo } from "@/config/site";

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
};

/** Which copy fields hold text the business typed, as opposed to the automatic text. */
export type CustomCopy = {
  heroHeading: boolean;
  steps: boolean;
  faqs: boolean;
};
