/**
 * Adds the Bharat Reefer fleet to the database, and a few test loads for trying out trips and
 * tracking links.
 *
 *   pnpm db:seed            add any of the fleet's trucks that are missing, and replace the test loads
 *   pnpm db:seed --clear    remove the test loads only
 *
 * The trucks are the "Bharat Reefer" sheet of "Truck List for Bharat reefer.xlsx". A truck
 * already in the fleet (same plate) is left as it is, so changes made in the panel survive.
 * Test loads are quoted (booked) requests marked with the user agent "seed-script"; only those are
 * ever replaced or removed. Their customers' email addresses are Resend's test inbox and their
 * phone is the business's own WhatsApp number, so trying a tracking link reaches no one else.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import type { MaterialId } from "../src/config/materials";
import { DEFAULT_FLEET, type FleetConfig } from "../src/config/fleet";
import { DEFAULT_BUSINESS } from "../src/config/site";
import { formatPlate } from "../src/features/fleet/plate";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { withExplicitSslMode } from "../src/lib/connection-string";
import { formatKg } from "../src/lib/format";
import { makeReference } from "../src/lib/reference-format";
import { planTrucks } from "../src/lib/truck-plan";

export const SEED_MARKER = "seed-script";

/** The fleet: [plate, payload kg, model, body length ft, tyres]. */
export const FLEET: Array<[string, number, string, number, number]> = [
  ["HR55AR6518", 9000, "AL 2214", 24, 6],
  ["HR55AR6348", 9000, "AL 2214", 24, 6],
  ["DL1LAG9516", 3000, "TATA 710", 14, 4],
  ["DL1LAH9566", 3000, "Eicher2059/2022", 14, 4],
  ["HR58D0488", 22000, "AL/2024", 32, 12],
  ["HR58D2818", 22000, "AL/2024", 32, 12],
  ["HR58D7670", 15000, "AL/2024", 32, 10],
  ["HR58D9723", 15000, "AL/2024", 32, 10],
];

type TestLoad = {
  name: string;
  company: string;
  from: [state: string, city: string];
  to: [state: string, city: string];
  material: MaterialId;
  kg: number;
  quote: number;
  pickupInDays: number;
  notes: string;
  /** The truck it is already on. Left out, it waits in the fleet queue. */
  truck?: string;
};

/** Two trucks with two customers each, and two loads waiting. */
const TEST_LOADS: TestLoad[] = [
  { name: "Asha Verma", company: "Verma Fresh Fruits", from: ["Delhi", "Azadpur"], to: ["Rajasthan", "Jaipur"], material: "CHILLED", kg: 2500, quote: 14_000, pickupInDays: 0, notes: "Apples in CFB boxes.", truck: "DL1LAG9516" },
  { name: "Rohit Mehta", company: "Mehta Ice Creams", from: ["Delhi", "Okhla"], to: ["Rajasthan", "Jaipur"], material: "FROZEN", kg: 400, quote: 4_500, pickupInDays: 0, notes: "Ice cream, 40 cartons.", truck: "DL1LAG9516" },
  { name: "Imran Sheikh", company: "Punjab Frozen Foods", from: ["Punjab", "Ludhiana"], to: ["Delhi", "Azadpur"], material: "FROZEN", kg: 6000, quote: 26_000, pickupInDays: 0, notes: "Frozen peas, 1 kg packs.", truck: "HR55AR6518" },
  { name: "Neha Kapoor", company: "Kapoor Dairy", from: ["Haryana", "Sonipat"], to: ["Delhi", "Azadpur"], material: "CHILLED", kg: 2000, quote: 7_500, pickupInDays: 0, notes: "Paneer and dairy, crates.", truck: "HR55AR6518" },
  { name: "Kavita Iyer", company: "Iyer Poultry", from: ["Delhi", "Narela"], to: ["Maharashtra", "Mumbai"], material: "FROZEN", kg: 14_000, quote: 98_000, pickupInDays: 1, notes: "Frozen chicken, 10 kg cartons." },
  { name: "Harpreet Singh", company: "Singh Sweets", from: ["Punjab", "Amritsar"], to: ["Delhi", "Delhi"], material: "CHILLED", kg: 1200, quote: 9_000, pickupInDays: 2, notes: "Dairy and sweets for a wedding." },
];

const DAY = 86_400_000;

/** The fleet as the quote form sees it: the trucks' payloads are the truck sizes. */
async function loadFleet(prisma: PrismaClient): Promise<FleetConfig> {
  const [sizes, settings] = await Promise.all([
    prisma.vehicle.groupBy({ by: ["capacityKg"], orderBy: { capacityKg: "asc" } }),
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
  ]);
  return {
    capacitiesKg: sizes.length > 0 ? sizes.map((size) => size.capacityKg) : DEFAULT_FLEET.capacitiesKg,
    minQuantityKg: settings?.minQuantityKg ?? DEFAULT_FLEET.minQuantityKg,
    maxQuantityKg: settings?.maxQuantityKg ?? DEFAULT_FLEET.maxQuantityKg,
    dedicatedFill: settings ? settings.dedicatedFillPercent / 100 : DEFAULT_FLEET.dedicatedFill,
  };
}

/** Removes the test loads. Their timelines, truck assignments and asks cascade. */
async function clear(prisma: PrismaClient) {
  const requests = await prisma.quoteRequest.deleteMany({ where: { userAgent: SEED_MARKER } });
  return { requests: requests.count };
}

async function seed(prisma: PrismaClient) {
  const trucks = await prisma.vehicle.createMany({
    data: FLEET.map(([plateNumber, capacityKg, model, lengthFt, tyres]) => ({ plateNumber, capacityKg, model, lengthFt, tyres })),
    skipDuplicates: true,
  });
  const vehicles = await prisma.vehicle.findMany({
    where: { plateNumber: { in: TEST_LOADS.flatMap((load) => (load.truck ? [load.truck] : [])) } },
    select: { id: true, plateNumber: true },
  });
  const vehicleId = new Map(vehicles.map((vehicle) => [vehicle.plateNumber, vehicle.id]));

  const [fleet, settings, existing] = await Promise.all([
    loadFleet(prisma),
    prisma.siteSettings.findUnique({ where: { id: "default" }, select: { phone: true, whatsapp: true } }),
    prisma.quoteRequest.findMany({ select: { reference: true } }),
  ]);
  const phone = settings?.whatsapp ?? settings?.phone ?? DEFAULT_BUSINESS.whatsapp ?? DEFAULT_BUSINESS.phone;
  const usedReferences = new Set(existing.map((row) => row.reference));
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`).getTime();

  let activities = 0;
  let placed = 0;
  for (const load of TEST_LOADS) {
    const plan = planTrucks(load.kg, fleet);
    if (!plan) throw new Error(`No truck plan for ${formatKg(load.kg)}. Check the load limits in the site settings.`);
    let reference = makeReference((max) => Math.floor(Math.random() * max));
    while (usedReferences.has(reference)) reference = makeReference((max) => Math.floor(Math.random() * max));
    usedReferences.add(reference);

    const truckId = load.truck ? vehicleId.get(load.truck) : undefined;
    if (load.truck && !truckId) throw new Error(`Truck ${load.truck} is not in the fleet.`);
    const timeline: Prisma.QuoteActivityCreateWithoutQuoteRequestInput[] = [
      { type: "NOTE", body: "Test load from the seed script, for trying trips and tracking links. pnpm db:seed --clear removes it." },
      { type: "STATUS_CHANGE", body: "Status changed from New to Quoted" },
      ...(load.truck ? [{ type: "ASSIGNMENT" as const, body: `Placed ${formatKg(load.kg)} on ${formatPlate(load.truck)}` }] : []),
    ];
    await prisma.quoteRequest.create({
      data: {
        reference,
        status: "QUOTED",
        originState: load.from[0],
        originCity: load.from[1],
        destinationState: load.to[0],
        destinationCity: load.to[1],
        material: load.material,
        quantityKg: load.kg,
        loadType: plan.loadType,
        truckPlan: plan.trucks,
        pickupDate: new Date(today + load.pickupInDays * DAY),
        notes: load.notes,
        contactName: load.name,
        companyName: load.company,
        phone,
        email: `delivered+${load.name.toLowerCase().replace(/\s+/g, ".")}@resend.dev`,
        quotedAmount: load.quote,
        userAgent: SEED_MARKER,
        activities: { create: timeline },
        ...(truckId ? { assignments: { create: { vehicleId: truckId, loadKg: load.kg } } } : {}),
      },
    });
    activities += timeline.length;
    if (truckId) placed += 1;
  }

  return { trucks: trucks.count, requests: TEST_LOADS.length, activities, placed };
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. See .env.example.");
  const where = (() => {
    const url = new URL(connectionString);
    return `${url.hostname}${url.pathname}`;
  })();

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: withExplicitSslMode(connectionString) }) });
  try {
    const removed = await clear(prisma);
    console.log(`Removed previous test loads from ${where}: ${removed.requests} requests.`);
    if (process.argv.includes("--clear")) return;

    const added = await seed(prisma);
    console.log(
      `Added to ${where}: ${added.trucks} of the fleet's ${FLEET.length} trucks (the rest were there already), ` +
        `${added.requests} test loads (${added.placed} on trucks), ${added.activities} timeline entries.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
