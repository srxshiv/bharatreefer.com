"use server";

import { updateTag } from "next/cache";
import { refreshAdminData } from "@/features/auth/refresh-admin";
import sharp from "sharp";
import type { z } from "zod";
import { MATERIAL_IDS } from "@/config/materials";
import { requireAdmin } from "@/features/auth/session";
import {
  MAX_FLEET_PHOTOS,
  MAX_ROUTES,
  SITE_CONTENT_TAG,
  addFleetPhoto,
  countFleetPhotos,
  deleteFleetPhoto,
  moveFleetPhoto,
  saveAnnouncement,
  saveBands,
  saveBusiness,
  saveCopy,
  saveFleet,
  saveRoutes,
  saveSections,
  updateFleetPhotoCaption,
} from "./data";
import { parseAnnouncementForm, parseRoutes, parseSectionsForm } from "./site-forms";
import {
  bandsSchema,
  businessSchema,
  copySchema,
  fleetSchema,
  readRows,
  splitExamples,
  toBusinessInfo,
  toCopyInput,
  toFleetInput,
  type BandsInput,
} from "./schema";

export type ContentFormState = {
  error?: string;
  success?: string;
};

/** Largest file accepted for upload, before resizing. */
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
/** Photos are stored no wider or taller than this. */
const MAX_PHOTO_EDGE = 1600;
/** Anything smaller than this on its long edge would look blurry on the site. */
const MIN_PHOTO_EDGE = 400;

const SAVED: ContentFormState = { success: "Saved. The website shows the change now." };

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue.path.filter((part) => typeof part === "string").join(" ");
  return path ? `${path}: ${issue.message}` : issue.message;
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Expires the public site's cached content and refreshes the admin page. */
function published() {
  updateTag(SITE_CONTENT_TAG);
  refreshAdminData();
}

export async function saveBusinessAction(formData: FormData): Promise<ContentFormState> {
  await requireAdmin();

  const parsed = businessSchema.safeParse({
    name: field(formData, "name"),
    tagline: field(formData, "tagline"),
    phone: field(formData, "phone"),
    whatsapp: field(formData, "whatsapp"),
    email: field(formData, "email"),
    alertEmail: field(formData, "alertEmail"),
    addressStreet: field(formData, "addressStreet"),
    addressCity: field(formData, "addressCity"),
    addressRegion: field(formData, "addressRegion"),
    hoursDays: formData.getAll("hoursDays").filter((day): day is string => typeof day === "string"),
    hoursOpen: field(formData, "hoursOpen"),
    hoursClose: field(formData, "hoursClose"),
    responseTime: field(formData, "responseTime"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await saveBusiness(toBusinessInfo(parsed.data));
  published();
  return SAVED;
}

export async function saveCopyAction(formData: FormData): Promise<ContentFormState> {
  await requireAdmin();

  const parsed = copySchema.safeParse({
    automaticHeading: formData.get("automaticHeading") === "on",
    heroHeading: field(formData, "heroHeading"),
    heroIntro: field(formData, "heroIntro"),
    automaticSteps: formData.get("automaticSteps") === "on",
    steps: readRows(formData, "steps"),
    automaticFaqs: formData.get("automaticFaqs") === "on",
    faqs: readRows(formData, "faqs"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await saveCopy(toCopyInput(parsed.data));
  published();
  return SAVED;
}

export async function saveBandsAction(formData: FormData): Promise<ContentFormState> {
  await requireAdmin();

  const parsed = bandsSchema.safeParse(
    Object.fromEntries(
      MATERIAL_IDS.map((id) => [
        id,
        {
          label: field(formData, `${id}.label`),
          range: field(formData, `${id}.range`),
          summary: field(formData, `${id}.summary`),
          examples: splitExamples(field(formData, `${id}.examples`)),
        },
      ]),
    ),
  );
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await saveBands(parsed.data as BandsInput);
  published();
  return SAVED;
}

export async function saveFleetAction(formData: FormData): Promise<ContentFormState> {
  await requireAdmin();

  const parsed = fleetSchema.safeParse({
    trucks: readRows(formData, "trucks"),
    minQuantityKg: field(formData, "minQuantityKg"),
    maxQuantityKg: field(formData, "maxQuantityKg"),
    dedicatedFillPercent: field(formData, "dedicatedFillPercent"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await saveFleet(toFleetInput(parsed.data));
  published();
  return SAVED;
}

export async function uploadFleetPhotoAction(formData: FormData): Promise<ContentFormState> {
  await requireAdmin();

  const file = formData.get("photo");
  const caption = field(formData, "caption").trim();
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Photos must be under 6 MB." };
  if (caption.length < 2 || caption.length > 120) {
    return { error: "Add a caption of 2 to 120 characters, for example the truck size or model." };
  }
  if ((await countFleetPhotos()) >= MAX_FLEET_PHOTOS) {
    return { error: `The site shows up to ${MAX_FLEET_PHOTOS} photos. Remove one first.` };
  }

  let processed: { data: Buffer; info: { width: number; height: number } };
  try {
    processed = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: MAX_PHOTO_EDGE, height: MAX_PHOTO_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { error: "That file is not a photo we can read. Use a JPEG, PNG, WebP or HEIC image." };
  }
  if (Math.max(processed.info.width, processed.info.height) < MIN_PHOTO_EDGE) {
    return { error: `That photo is too small. Use one at least ${MIN_PHOTO_EDGE} pixels wide.` };
  }

  await addFleetPhoto({
    caption,
    width: processed.info.width,
    height: processed.info.height,
    contentType: "image/webp",
    bytes: processed.data,
  });
  published();
  return { success: "Photo added." };
}

export async function updateFleetPhotoCaptionAction(
  id: string,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();

  const caption = field(formData, "caption").trim();
  if (caption.length < 2 || caption.length > 120) {
    return { error: "Captions are 2 to 120 characters." };
  }
  if (!(await updateFleetPhotoCaption(id, caption))) return { error: "That photo no longer exists." };

  published();
  return { success: "Caption saved." };
}

export async function deleteFleetPhotoAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteFleetPhoto(id);
  published();
}

export async function moveFleetPhotoAction(id: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  await moveFleetPhoto(id, direction);
  published();
}

export async function saveSectionsAction(formData: FormData): Promise<ContentFormState> {
  await requireAdmin();
  const parsed = parseSectionsForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  await saveSections(parsed.value);
  published();
  return SAVED;
}

export async function saveAnnouncementAction(formData: FormData): Promise<ContentFormState> {
  await requireAdmin();
  const parsed = parseAnnouncementForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  await saveAnnouncement(parsed.value);
  published();
  return parsed.value.enabled ? SAVED : { success: "Saved. The announcement is off." };
}

export async function saveRoutesAction(formData: FormData): Promise<ContentFormState> {
  await requireAdmin();
  const parsed = parseRoutes(readRows(formData, "routes"), MAX_ROUTES);
  if (!parsed.ok) return { error: parsed.error };
  await saveRoutes(parsed.value);
  published();
  return SAVED;
}
