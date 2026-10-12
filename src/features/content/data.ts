import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { DEFAULT_FLEET, type FleetConfig } from "@/config/fleet";
import { DEFAULT_BANDS, MATERIAL_IDS, type MaterialId, type TemperatureBandInfo } from "@/config/materials";
import { DEFAULT_BUSINESS, type BusinessInfo } from "@/config/site";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { normaliseDays } from "@/lib/hours";
import { DEFAULT_HERO_INTRO, automaticFaqs, automaticHeading, automaticSteps } from "./automatic";
import type { CustomCopy, Faq, FleetPhotoInfo, SiteContent, Step, TruckSizeInfo } from "./types";

/** Cache tag for everything on the public site. Admin saves expire it with `updateTag`. */
export const SITE_CONTENT_TAG = "site-content";

const SETTINGS_ID = "default";

type SettingsRow = Prisma.SiteSettingsGetPayload<{ select: typeof settingsSelect }>;
type BandRow = Prisma.TemperatureBandGetPayload<{ select: typeof bandSelect }>;

const settingsSelect = {
  name: true,
  tagline: true,
  phone: true,
  whatsapp: true,
  email: true,
  alertEmail: true,
  addressStreet: true,
  addressCity: true,
  addressRegion: true,
  hoursDays: true,
  hoursOpen: true,
  hoursClose: true,
  responseTime: true,
  heroHeading: true,
  heroIntro: true,
  steps: true,
  faqs: true,
  minQuantityKg: true,
  maxQuantityKg: true,
  dedicatedFillPercent: true,
} satisfies Prisma.SiteSettingsSelect;

const bandSelect = {
  id: true,
  label: true,
  range: true,
  summary: true,
  examples: true,
} satisfies Prisma.TemperatureBandSelect;

const photoSelect = {
  id: true,
  caption: true,
  width: true,
  height: true,
} satisfies Prisma.FleetPhotoSelect;

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stepList(value: unknown): Step[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (item): item is Step =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Step).title === "string" &&
      typeof (item as Step).body === "string",
  );
}

function faqList(value: unknown): Faq[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (item): item is Faq =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Faq).question === "string" &&
      typeof (item as Faq).answer === "string",
  );
}

function businessFrom(row: SettingsRow | null): BusinessInfo {
  if (!row) return DEFAULT_BUSINESS;
  return {
    name: row.name,
    tagline: row.tagline,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    alertEmail: row.alertEmail,
    address: { street: row.addressStreet, city: row.addressCity, region: row.addressRegion },
    hours: {
      days: normaliseDays(stringList(row.hoursDays)),
      opens: row.hoursOpen,
      closes: row.hoursClose,
    },
    responseTime: row.responseTime,
  };
}

function fleetFrom(row: SettingsRow | null, trucks: TruckSizeInfo[]): FleetConfig {
  return {
    capacitiesKg: trucks.length > 0 ? trucks.map((truck) => truck.capacityKg) : DEFAULT_FLEET.capacitiesKg,
    minQuantityKg: row?.minQuantityKg ?? DEFAULT_FLEET.minQuantityKg,
    maxQuantityKg: row?.maxQuantityKg ?? DEFAULT_FLEET.maxQuantityKg,
    dedicatedFill: row ? row.dedicatedFillPercent / 100 : DEFAULT_FLEET.dedicatedFill,
  };
}

function bandsFrom(rows: BandRow[]): Record<MaterialId, TemperatureBandInfo> {
  const bands = { ...DEFAULT_BANDS };
  for (const row of rows) {
    bands[row.id] = {
      id: row.id,
      label: row.label,
      range: row.range,
      summary: row.summary,
      examples: stringList(row.examples),
    };
  }
  return bands;
}

function assemble(
  row: SettingsRow | null,
  bandRows: BandRow[],
  truckRows: TruckSizeInfo[],
  photos: FleetPhotoInfo[],
): { content: SiteContent; custom: CustomCopy } {
  const business = businessFrom(row);
  const trucks = truckRows.length > 0
    ? truckRows
    : DEFAULT_FLEET.capacitiesKg.map((capacityKg) => ({ capacityKg, name: null }));
  const fleet = fleetFrom(row, trucks);
  const steps = stepList(row?.steps);
  const faqs = faqList(row?.faqs);

  return {
    content: {
      business,
      fleet,
      trucks,
      bands: bandsFrom(bandRows),
      copy: {
        heroHeading: row?.heroHeading ?? automaticHeading(fleet),
        heroIntro: row?.heroIntro ?? DEFAULT_HERO_INTRO,
        steps: steps ?? automaticSteps(business),
        faqs: faqs ?? automaticFaqs(business, fleet),
      },
      photos,
    },
    custom: {
      heroHeading: row?.heroHeading != null,
      steps: steps !== null,
      faqs: faqs !== null,
    },
  };
}

async function load(): Promise<{ content: SiteContent; custom: CustomCopy }> {
  const [row, bandRows, truckRows, photos] = await Promise.all([
    db().siteSettings.findUnique({ where: { id: SETTINGS_ID }, select: settingsSelect }),
    db().temperatureBand.findMany({ select: bandSelect }),
    db().truckSize.findMany({ orderBy: { capacityKg: "asc" }, select: { capacityKg: true, name: true } }),
    db().fleetPhoto.findMany({ orderBy: { position: "asc" }, select: photoSelect }),
  ]);
  return assemble(row, bandRows, truckRows, photos);
}

/** Current content straight from the database. Admin pages and background jobs use this. */
export async function readSiteContent(): Promise<{ content: SiteContent; custom: CustomCopy }> {
  return load();
}

/**
 * Content for the public site. Cached, so pages prerender with it and stay static until an
 * admin saves a change. Falls back to the defaults if the database cannot be reached, so a
 * database problem shows stale copy rather than an error page.
 */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("hours");
  cacheTag(SITE_CONTENT_TAG);

  try {
    return (await load()).content;
  } catch (error) {
    console.error("Could not load site content, using the defaults", error);
    return assemble(null, [], [], []).content;
  }
}

/** Columns for a brand-new settings row, before any of the admin's own values are applied. */
function defaultSettingsRow(): Prisma.SiteSettingsCreateInput {
  const business = DEFAULT_BUSINESS;
  return {
    id: SETTINGS_ID,
    name: business.name,
    tagline: business.tagline,
    phone: business.phone,
    whatsapp: business.whatsapp,
    email: business.email,
    alertEmail: business.alertEmail,
    addressStreet: business.address.street,
    addressCity: business.address.city,
    addressRegion: business.address.region,
    hoursDays: business.hours.days,
    hoursOpen: business.hours.opens,
    hoursClose: business.hours.closes,
    responseTime: business.responseTime,
    heroHeading: null,
    heroIntro: DEFAULT_HERO_INTRO,
    steps: undefined,
    faqs: undefined,
    minQuantityKg: DEFAULT_FLEET.minQuantityKg,
    maxQuantityKg: DEFAULT_FLEET.maxQuantityKg,
    dedicatedFillPercent: Math.round(DEFAULT_FLEET.dedicatedFill * 100),
  };
}

async function patchSettings(patch: Prisma.SiteSettingsUpdateInput): Promise<void> {
  await db().siteSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { ...defaultSettingsRow(), ...(patch as Prisma.SiteSettingsCreateInput) },
    update: patch,
  });
}

export async function saveBusiness(business: BusinessInfo): Promise<void> {
  await patchSettings({
    name: business.name,
    tagline: business.tagline,
    phone: business.phone,
    whatsapp: business.whatsapp,
    email: business.email,
    alertEmail: business.alertEmail,
    addressStreet: business.address.street,
    addressCity: business.address.city,
    addressRegion: business.address.region,
    hoursDays: business.hours.days,
    hoursOpen: business.hours.opens,
    hoursClose: business.hours.closes,
    responseTime: business.responseTime,
  });
}

export type CopyInput = {
  /** Null restores the automatic heading. */
  heroHeading: string | null;
  heroIntro: string;
  /** Null restores the automatic steps. */
  steps: Step[] | null;
  /** Null restores the automatic questions. */
  faqs: Faq[] | null;
};

export async function saveCopy(copy: CopyInput): Promise<void> {
  await patchSettings({
    heroHeading: copy.heroHeading,
    heroIntro: copy.heroIntro,
    steps: copy.steps ?? Prisma.DbNull,
    faqs: copy.faqs ?? Prisma.DbNull,
  });
}

export async function saveBands(bands: Record<MaterialId, Omit<TemperatureBandInfo, "id">>): Promise<void> {
  await db().$transaction(
    MATERIAL_IDS.map((id) =>
      db().temperatureBand.upsert({
        where: { id },
        create: { id, ...bands[id] },
        update: bands[id],
      }),
    ),
  );
}

export type FleetInput = {
  trucks: TruckSizeInfo[];
  minQuantityKg: number;
  maxQuantityKg: number;
  dedicatedFillPercent: number;
};

export async function saveFleet(fleet: FleetInput): Promise<void> {
  await db().$transaction(async (tx) => {
    await tx.truckSize.deleteMany();
    await tx.truckSize.createMany({ data: fleet.trucks });
    await tx.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        ...defaultSettingsRow(),
        minQuantityKg: fleet.minQuantityKg,
        maxQuantityKg: fleet.maxQuantityKg,
        dedicatedFillPercent: fleet.dedicatedFillPercent,
      },
      update: {
        minQuantityKg: fleet.minQuantityKg,
        maxQuantityKg: fleet.maxQuantityKg,
        dedicatedFillPercent: fleet.dedicatedFillPercent,
      },
    });
  });
}

/** Most photos the public site shows. */
export const MAX_FLEET_PHOTOS = 12;

export async function countFleetPhotos(): Promise<number> {
  return db().fleetPhoto.count();
}

export async function addFleetPhoto(photo: {
  caption: string;
  width: number;
  height: number;
  contentType: string;
  bytes: Uint8Array;
}): Promise<void> {
  await db().$transaction(async (tx) => {
    const last = await tx.fleetPhoto.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
    await tx.fleetPhoto.create({
      data: { ...photo, bytes: Buffer.from(photo.bytes), position: (last?.position ?? 0) + 1 },
    });
  });
}

export async function updateFleetPhotoCaption(id: string, caption: string): Promise<boolean> {
  const { count } = await db().fleetPhoto.updateMany({ where: { id }, data: { caption } });
  return count > 0;
}

export async function deleteFleetPhoto(id: string): Promise<boolean> {
  const { count } = await db().fleetPhoto.deleteMany({ where: { id } });
  return count > 0;
}

/** Swaps the photo with its neighbour in the given direction. Returns false if it is already at the end. */
export async function moveFleetPhoto(id: string, direction: "up" | "down"): Promise<boolean> {
  return db().$transaction(async (tx) => {
    const photos = await tx.fleetPhoto.findMany({ orderBy: { position: "asc" }, select: { id: true } });
    const index = photos.findIndex((photo) => photo.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= photos.length) return false;

    const reordered = [...photos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    // Renumber from 1 so positions stay dense whatever happened before.
    for (const [position, photo] of reordered.entries()) {
      await tx.fleetPhoto.update({ where: { id: photo.id }, data: { position: position + 1 } });
    }
    return true;
  });
}

/** The stored image for /media/fleet/[id]. */
export async function getFleetPhotoFile(
  id: string,
): Promise<{ contentType: string; bytes: Uint8Array } | null> {
  return db().fleetPhoto.findUnique({ where: { id }, select: { contentType: true, bytes: true } });
}
