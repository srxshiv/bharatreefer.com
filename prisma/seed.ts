/**
 * Fills the database with realistic sample data so the admin panel has something to show.
 *
 *   pnpm db:seed            replace the sample data (real requests are never touched)
 *   pnpm db:seed --clear    remove the sample data only
 *
 * Sample quote requests are marked with the user agent "seed-script"; sample trucks are
 * the plates listed in SAMPLE_TRUCKS. Only those rows are ever replaced or removed.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { withExplicitSslMode } from "../src/lib/connection-string";
import { DEFAULT_FLEET, type FleetConfig } from "../src/config/fleet";
import { PrismaClient, type QuoteStatus } from "../src/generated/prisma/client";
import { makeReference } from "../src/lib/reference-format";
import { planTrucks } from "../src/lib/truck-plan";

export const SEED_MARKER = "seed-script";

/** Deterministic pseudo-random numbers, so every run produces the same sample data. */
function generator(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (probability: number) => next() < probability,
  };
}

type Lane = {
  from: [state: string, city: string];
  to: [state: string, city: string];
  km: number;
  cargo: Array<{ material: "FROZEN" | "CHILLED" | "AMBIENT"; note: string }>;
};

/** Common cold-chain lanes in India, with rough road distances. */
const LANES: Lane[] = [
  { from: ["Punjab", "Ludhiana"], to: ["Maharashtra", "Mumbai"], km: 1650, cargo: [{ material: "FROZEN", note: "Frozen peas and mixed veg, 1 kg packs" }, { material: "CHILLED", note: "Paneer and dairy, crates" }] },
  { from: ["Delhi", "Azadpur"], to: ["Rajasthan", "Jaipur"], km: 280, cargo: [{ material: "CHILLED", note: "Apples and pears, CFB boxes" }, { material: "CHILLED", note: "Leafy vegetables, plastic crates" }] },
  { from: ["Jammu and Kashmir", "Srinagar"], to: ["Delhi", "Azadpur"], km: 810, cargo: [{ material: "CHILLED", note: "Apples, 20 kg boxes" }] },
  { from: ["Gujarat", "Anand"], to: ["Maharashtra", "Mumbai"], km: 430, cargo: [{ material: "CHILLED", note: "Milk products, chilled" }, { material: "FROZEN", note: "Ice cream, 600 cartons" }] },
  { from: ["Maharashtra", "Nashik"], to: ["Delhi", "Delhi"], km: 1300, cargo: [{ material: "CHILLED", note: "Grapes for export, 5 kg boxes" }, { material: "CHILLED", note: "Onions and pomegranates" }] },
  { from: ["Andhra Pradesh", "Visakhapatnam"], to: ["West Bengal", "Kolkata"], km: 880, cargo: [{ material: "FROZEN", note: "Frozen shrimp, master cartons" }] },
  { from: ["Odisha", "Bhubaneswar"], to: ["West Bengal", "Kolkata"], km: 440, cargo: [{ material: "FROZEN", note: "Frozen fish, ice-glazed" }] },
  { from: ["Kerala", "Kochi"], to: ["Karnataka", "Bengaluru"], km: 550, cargo: [{ material: "FROZEN", note: "Seafood, export grade" }, { material: "AMBIENT", note: "Spices and coconut products" }] },
  { from: ["Himachal Pradesh", "Baddi"], to: ["Uttar Pradesh", "Lucknow"], km: 700, cargo: [{ material: "CHILLED", note: "Pharma, 2 to 8 °C, data logger needed" }, { material: "AMBIENT", note: "Pharma, ambient, cartons" }] },
  { from: ["Haryana", "Karnal"], to: ["Delhi", "Okhla"], km: 130, cargo: [{ material: "CHILLED", note: "Dairy, morning delivery" }] },
  { from: ["Maharashtra", "Pune"], to: ["Tamil Nadu", "Chennai"], km: 1180, cargo: [{ material: "FROZEN", note: "Frozen chicken, 10 kg cartons" }, { material: "FROZEN", note: "Frozen snacks and parathas" }] },
  { from: ["Tamil Nadu", "Hosur"], to: ["Karnataka", "Bengaluru"], km: 40, cargo: [{ material: "CHILLED", note: "Cut flowers, roses" }] },
  { from: ["Maharashtra", "Nagpur"], to: ["Telangana", "Hyderabad"], km: 500, cargo: [{ material: "CHILLED", note: "Oranges, 15 kg crates" }] },
  { from: ["Madhya Pradesh", "Indore"], to: ["Gujarat", "Ahmedabad"], km: 400, cargo: [{ material: "AMBIENT", note: "Packaged snacks, FMCG" }, { material: "CHILLED", note: "Chocolates and confectionery" }] },
  { from: ["Uttar Pradesh", "Noida"], to: ["Uttarakhand", "Dehradun"], km: 260, cargo: [{ material: "FROZEN", note: "Ice cream, retail restock" }] },
  { from: ["Telangana", "Hyderabad"], to: ["Andhra Pradesh", "Vijayawada"], km: 275, cargo: [{ material: "FROZEN", note: "Frozen meat, halal certified" }] },
  { from: ["West Bengal", "Kolkata"], to: ["Assam", "Guwahati"], km: 1030, cargo: [{ material: "AMBIENT", note: "Beverages, pallets" }, { material: "FROZEN", note: "Frozen foods for retail chain" }] },
  { from: ["Punjab", "Amritsar"], to: ["Haryana", "Gurugram"], km: 480, cargo: [{ material: "CHILLED", note: "Dairy and sweets for a wedding" }] },
];

const FIRST_NAMES = ["Asha", "Rohit", "Kavita", "Imran", "Neha", "Suresh", "Harpreet", "Anil", "Meera", "Vikas", "Lakshmi", "Arjun", "Farah", "Sanjay", "Priya", "Gurdeep", "Ritu", "Karthik", "Pooja", "Manoj", "Divya", "Sameer", "Anjali", "Rakesh"];
const LAST_NAMES = ["Verma", "Mehta", "Iyer", "Sheikh", "Kapoor", "Patel", "Singh", "Thomas", "Nair", "Jain", "Reddy", "Gupta", "Khan", "Rao", "Sharma", "Gill", "Bansal", "Subramanian", "Desai", "Tiwari", "Menon", "Qureshi", "Chopra", "Joshi"];

/** Weight ranges that match each status's typical customer, in kg. */
const WEIGHTS = [250, 400, 700, 900, 1200, 1500, 2200, 3000, 3800, 5500, 6500, 8000, 9000, 12_000, 14_500, 16_000, 18_000, 21_000, 22_000, 30_000, 44_000];

/** Rough reefer freight in rupees per km for each truck size. */
const RATE_PER_KM: Record<number, number> = { 900: 24, 1500: 28, 2500: 32, 4000: 40, 7000: 52, 9000: 58, 12000: 64, 16000: 74, 22000: 88 };

const STATUS_PLAN: Array<{ status: QuoteStatus; count: number; maxAgeDays: number }> = [
  { status: "NEW", count: 12, maxAgeDays: 3 },
  { status: "CONTACTED", count: 10, maxAgeDays: 8 },
  { status: "QUOTED", count: 12, maxAgeDays: 14 },
  { status: "CONFIRMED", count: 14, maxAgeDays: 12 },
  { status: "COMPLETED", count: 10, maxAgeDays: 40 },
  { status: "LOST", count: 5, maxAgeDays: 35 },
  { status: "SPAM", count: 1, maxAgeDays: 10 },
];

const STATUS_LABEL: Record<QuoteStatus, string> = {
  NEW: "New", CONTACTED: "Contacted", QUOTED: "Quoted", CONFIRMED: "Confirmed", COMPLETED: "Completed", LOST: "Lost", SPAM: "Spam",
};

/** Sample trucks: [plate, payload kg, model, body length ft, tyres, temperature]. Real Indian plate format. */
export const SAMPLE_TRUCKS: Array<[string, number, string, number, number, "FROZEN" | "CHILLED" | "AMBIENT" | null]> = [
  ["DL01LA4521", 900, "Tata Ace Gold reefer", 7, 4, "CHILLED"],
  ["DL01LB7730", 900, "Tata Ace Gold reefer", 7, 4, "FROZEN"],
  ["HR55AK1290", 1500, "Mahindra Bolero Pik-Up reefer", 8.5, 4, "CHILLED"],
  ["HR55AK3384", 1500, "Mahindra Bolero Pik-Up reefer", 8.5, 4, null],
  ["DL03CG5512", 2500, "Tata Intra V50 reefer", 10, 4, "FROZEN"],
  ["HR38Z4410", 4000, "Tata 407 reefer", 14, 6, "FROZEN"],
  ["HR38Z6672", 4000, "Tata 407 reefer", 14, 6, null],
  ["DL01GC2209", 7000, "Eicher Pro 2095", 17, 6, "CHILLED"],
  ["HR63E8891", 9000, "Eicher Pro 3015", 20, 6, "FROZEN"],
  ["HR63E9014", 9000, "Eicher Pro 3015", 20, 6, null],
  ["PB10HR3321", 16000, "Tata LPT 1916", 24, 10, "FROZEN"],
  ["PB10HR4478", 16000, "Ashok Leyland 1920", 24, 10, "AMBIENT"],
  ["PB10HS0912", 16000, "Tata LPT 1916", 24, 10, null],
  ["DL01GD7765", 22000, "BharatBenz 2823R", 32, 12, "FROZEN"],
  ["DL01GD8810", 22000, "Tata Signa 2825", 32, 12, null],
];

type SeedTruck = { id: string; capacityKg: number; status: string; usedKg: number; band: string | null; temperature: string | null };

const DAY = 86_400_000;
const HOUR = 3_600_000;

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

async function loadFleet(prisma: PrismaClient): Promise<FleetConfig> {
  const [sizes, settings] = await Promise.all([
    prisma.truckSize.findMany({ orderBy: { capacityKg: "asc" }, select: { capacityKg: true } }),
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
  ]);
  return {
    capacitiesKg: sizes.length > 0 ? sizes.map((size) => size.capacityKg) : DEFAULT_FLEET.capacitiesKg,
    minQuantityKg: settings?.minQuantityKg ?? DEFAULT_FLEET.minQuantityKg,
    maxQuantityKg: settings?.maxQuantityKg ?? DEFAULT_FLEET.maxQuantityKg,
    dedicatedFill: settings ? settings.dedicatedFillPercent / 100 : DEFAULT_FLEET.dedicatedFill,
  };
}

async function clear(prisma: PrismaClient) {
  const plates = SAMPLE_TRUCKS.map(([plate]) => plate);
  // Assignments and timelines cascade from their request or truck.
  const [requests, trucks] = await prisma.$transaction([
    prisma.quoteRequest.deleteMany({ where: { userAgent: SEED_MARKER } }),
    prisma.vehicle.deleteMany({ where: { plateNumber: { in: plates } } }),
  ]);
  return { requests: requests.count, trucks: trucks.count };
}

async function seed(prisma: PrismaClient) {
  const random = generator(20261014);
  const fleet = await loadFleet(prisma);
  const now = Date.now();
  const usedReferences = new Set(
    (await prisma.quoteRequest.findMany({ select: { reference: true } })).map((row) => row.reference),
  );

  type Row = Parameters<PrismaClient["quoteRequest"]["create"]>[0]["data"] & { reference: string };
  const rows: Row[] = [];
  const timelines: Array<Array<{ type: "STATUS_CHANGE" | "PRICE_CHANGE" | "NOTE"; body: string; at: Date }>> = [];

  for (const { status, count, maxAgeDays } of STATUS_PLAN) {
    for (let i = 0; i < count; i += 1) {
      const lane = random.pick(LANES);
      const cargo = random.pick(lane.cargo);
      const quantityKg = status === "SPAM" ? 10 : random.pick(WEIGHTS);
      const plan = planTrucks(Math.min(Math.max(quantityKg, fleet.minQuantityKg), fleet.maxQuantityKg), fleet);
      if (!plan) continue;

      const createdAt = new Date(now - random.int(1, maxAgeDays * 24) * HOUR - random.int(0, 59) * 60_000);
      let reference = makeReference((max) => random.int(0, max - 1));
      while (usedReferences.has(reference)) reference = makeReference((max) => random.int(0, max - 1));
      usedReferences.add(reference);

      const first = random.pick(FIRST_NAMES);
      const last = random.pick(LAST_NAMES);
      const truckRate = plan.trucks.reduce((sum, truck) => sum + (RATE_PER_KM[truck.capacityKg] ?? 60) * truck.count, 0);
      const freight = plan.loadType === "PART_LOAD"
        ? truckRate * lane.km * Math.max(plan.fill, 0.25) * 1.3
        : truckRate * lane.km;
      const quoted = ["QUOTED", "CONFIRMED", "COMPLETED"].includes(status) || (status === "LOST" && random.chance(0.6))
        ? Math.max(3000, roundTo(freight, 500))
        : null;

      // Confirmed loads leave in the coming days; completed ones already went.
      const pickup =
        status === "CONFIRMED" ? new Date(now + random.int(0, 9) * DAY)
        : status === "COMPLETED" ? new Date(createdAt.getTime() + random.int(1, 4) * DAY)
        : random.chance(0.5) ? new Date(now + random.int(1, 20) * DAY)
        : null;

      rows.push({
        reference,
        status,
        originState: lane.from[0],
        originCity: lane.from[1],
        destinationState: lane.to[0],
        destinationCity: lane.to[1],
        material: cargo.material,
        quantityKg,
        loadType: plan.loadType,
        truckPlan: plan.trucks,
        pickupDate: pickup ? new Date(`${pickup.toISOString().slice(0, 10)}T00:00:00Z`) : null,
        notes: status === "SPAM" ? "Buy cheap followers now!!! visit our site" : random.chance(0.7) ? cargo.note : null,
        contactName: status === "SPAM" ? "Best Offers" : `${first} ${last}`,
        phone: `+9199${String(random.int(10_000_000, 99_999_999))}`,
        email: random.chance(0.55) ? `${first}.${last}`.toLowerCase() + "@example.com" : null,
        quotedAmount: quoted,
        userAgent: SEED_MARKER,
        createdAt,
        updatedAt: createdAt,
      });

      // The timeline that would have produced this status.
      const steps: Array<{ type: "STATUS_CHANGE" | "PRICE_CHANGE" | "NOTE"; body: string; at: Date }> = [];
      const path: QuoteStatus[] =
        status === "CONTACTED" ? ["CONTACTED"]
        : status === "QUOTED" ? ["CONTACTED", "QUOTED"]
        : status === "CONFIRMED" ? ["CONTACTED", "QUOTED", "CONFIRMED"]
        : status === "COMPLETED" ? ["CONTACTED", "QUOTED", "CONFIRMED", "COMPLETED"]
        : status === "LOST" ? (quoted ? ["CONTACTED", "QUOTED", "LOST"] : ["CONTACTED", "LOST"])
        : status === "SPAM" ? ["SPAM"]
        : [];
      let previous: QuoteStatus = "NEW";
      let at = createdAt.getTime();
      for (const next of path) {
        at += random.int(1, 18) * HOUR;
        if (at > now) at = now - random.int(1, 50) * 60_000;
        if (next === "QUOTED" && quoted) {
          steps.push({ type: "PRICE_CHANGE", body: `Quote set to ₹${quoted.toLocaleString("en-IN")}`, at: new Date(at) });
        }
        steps.push({ type: "STATUS_CHANGE", body: `Status changed from ${STATUS_LABEL[previous]} to ${STATUS_LABEL[next]}`, at: new Date(at) });
        if (next === "CONTACTED" && random.chance(0.5)) {
          steps.push({ type: "NOTE", body: random.pick(["Spoke to the customer, wants a rate by evening.", "Customer asked if we can load after 6 PM.", "Needs a data logger for the trip.", "Repeat customer, usual rate."]), at: new Date(at + 5 * 60_000) });
        }
        previous = next;
      }
      timelines.push(steps);
    }
  }

  const created = await prisma.quoteRequest.createManyAndReturn({ data: rows, select: { id: true, reference: true } });
  const idByReference = new Map(created.map((row) => [row.reference, row.id]));
  const activities = rows.flatMap((row, index) =>
    timelines[index].map((step) => ({
      quoteRequestId: idByReference.get(row.reference)!,
      type: step.type,
      body: step.body,
      createdAt: step.at,
    })),
  );
  await prisma.quoteActivity.createMany({ data: activities });

  // Sample trucks, and confirmed loads assigned to some of them.
  const plates = new Set((await prisma.vehicle.findMany({ select: { plateNumber: true } })).map((v) => v.plateNumber));
  const trucks = SAMPLE_TRUCKS.filter(([plate]) => !plates.has(plate));
  await prisma.vehicle.createMany({
    data: trucks.map(([plateNumber, capacityKg, model, lengthFt, tyres, temperature], index) => ({
      plateNumber,
      capacityKg,
      model,
      lengthFt,
      tyres,
      temperature,
      driverName: index % 3 === 0 ? null : `${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`,
      driverPhone: index % 3 === 0 ? null : `+9198${String(random.int(10_000_000, 99_999_999))}`,
      status: index === 9 ? "MAINTENANCE" : "AVAILABLE",
    })),
  });
  const vehicles = await prisma.vehicle.findMany({
    where: { plateNumber: { in: SAMPLE_TRUCKS.map(([plate]) => plate) } },
    select: { id: true, plateNumber: true, capacityKg: true, status: true, temperature: true },
  });
  const fleetState: SeedTruck[] = vehicles.map((vehicle) => ({ ...vehicle, usedKg: 0, band: null }));

  // A few confirmed loads are already on trucks, each on its own truck with plenty of room
  // left, so a handful of trucks are part loaded and most are empty. The rest of the
  // confirmed loads wait in the fleet queue for a truck to be chosen.
  const PART_LOADED_TRUCKS = 4;
  const confirmed = rows
    .filter((row) => row.status === "CONFIRMED")
    .map((row) => ({ id: idByReference.get(row.reference)!, kg: row.quantityKg as number, material: row.material as string }));
  const assignments: Array<{ vehicleId: string; quoteRequestId: string; loadKg: number; deliveredAt?: Date }> = [];
  for (const order of confirmed) {
    if (assignments.length >= PART_LOADED_TRUCKS) break;
    const truck = fleetState
      .filter(
        (candidate) =>
          candidate.status === "AVAILABLE" &&
          candidate.usedKg === 0 &&
          (candidate.temperature === null || candidate.temperature === order.material) &&
          // Ends up no more than two thirds full.
          candidate.capacityKg >= order.kg * 1.5,
      )
      .sort((a, b) => a.capacityKg - b.capacityKg)[0];
    if (!truck) continue;
    truck.usedKg = order.kg;
    truck.band = order.material;
    assignments.push({ vehicleId: truck.id, quoteRequestId: order.id, loadKg: order.kg });
  }

  // Completed requests were delivered by a truck of the right size, a couple of days after
  // they came in. This history is what the request timelines refer to.
  const completed = rows.filter((row) => row.status === "COMPLETED");
  for (const row of completed) {
    const truck = [...vehicles].sort((a, b) => a.capacityKg - b.capacityKg).find((candidate) => candidate.capacityKg >= (row.quantityKg as number)) ?? vehicles.at(-1)!;
    assignments.push({
      vehicleId: truck.id,
      quoteRequestId: idByReference.get(row.reference)!,
      loadKg: row.quantityKg as number,
      deliveredAt: new Date((row.createdAt as Date).getTime() + 2 * DAY),
    });
  }
  await prisma.truckAssignment.createMany({ data: assignments });

  return { requests: created.length, activities: activities.length, trucks: trucks.length, assignments: assignments.length };
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
    console.log(`Removed previous sample data from ${where}: ${removed.requests} requests, ${removed.trucks} trucks.`);
    if (process.argv.includes("--clear")) return;

    const added = await seed(prisma);
    console.log(
      `Added sample data to ${where}: ${added.requests} requests, ${added.activities} timeline entries, ${added.trucks} trucks, ${added.assignments} truck assignments.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
