"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_BUSINESS, type BusinessInfo } from "@/config/site";

const BusinessContext = createContext<BusinessInfo>(DEFAULT_BUSINESS);

/** Makes the business details available to Client Components, including error boundaries. */
export function SiteProvider({ business, children }: { business: BusinessInfo; children: ReactNode }) {
  return <BusinessContext value={business}>{children}</BusinessContext>;
}

export function useBusiness(): BusinessInfo {
  return useContext(BusinessContext);
}
