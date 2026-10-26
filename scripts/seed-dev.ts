/**
 * Fills a local development database with a test admin account and sample quote
 * requests, so the admin panel has something to show.
 *
 *   pnpm db:seed
 *
 * Then sign in at /admin with admin@test.com and the password below. Safe to run again:
 * it resets that password and replaces the sample requests, leaving everything else alone.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_FLEET } from "../src/config/fleet";
import type { MaterialId } from "../src/config/materials";
import { DEFAULT_BUSINESS } from "../src/config/site";
import { STATUS_LABELS, type QuoteStatusId } from "../src/features/quotes/status";
import { choosePromoCode } from "../src/features/team/promo-code";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { dateInIndia } from "../src/lib/dates";
import { formatInr } from "../src/lib/format";
import { hashPassword } from "../src/lib/password";
import { planTrucks } from "../src/lib/truck-plan";

// A short, known password: this script refuses to run against anything but a local database.
const ADMIN = { email: "admin@test.com", name: "Test Admin", password: "motilulli" };

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

/** Stored in `userAgent`, which no page shows, so a later run can find the sample requests. */
const SEED_MARKER = "seed-dev";

const HOUR_MS = 60 * 60 * 1000;

type Place = [city: string, state: string];

type Sample = {
  status: QuoteStatusId;
  /** How long before the seed runs the request came in. */
  hoursAgo: number;
  from: Place;
  to: Place;
  material: MaterialId;
  kg: number;
  name: string;
  email?: string;
  /** Pickup date as days from today; negative for loads already moved. */
  pickupInDays?: number;
  /** What the customer typed in the form. */
  notes?: string;
  /** Freight quoted, in rupees. */
  quote?: number;
  /** Internal note left by dispatch. */
  note?: string;
};

const SAMPLES: Sample[] = [
  // New
  { status: "NEW", hoursAgo: 1, from: ["Azadpur", "Delhi"], to: ["Jaipur", "Rajasthan"], material: "CHILLED", kg: 3200, name: "Rakesh Gupta", pickupInDays: 2,
    notes: "Apples and pears in crates. Loading from Azadpur mandi after 6 pm." },
  { status: "NEW", hoursAgo: 3, from: ["Anand", "Gujarat"], to: ["Mumbai", "Maharashtra"], material: "CHILLED", kg: 14500, name: "Hetal Patel", email: "hetal@anandmilkfoods.example", pickupInDays: 1,
    notes: "Paneer and butter, palletised." },
  { status: "NEW", hoursAgo: 5, from: ["Bhimavaram", "Andhra Pradesh"], to: ["Kolkata", "West Bengal"], material: "FROZEN", kg: 21000, name: "Suresh Raju", pickupInDays: 3,
    notes: "Frozen shrimp in 20 kg cartons. Need the temperature log printout at delivery." },
  { status: "NEW", hoursAgo: 9, from: ["Ludhiana", "Punjab"], to: ["Delhi", "Delhi"], material: "AMBIENT", kg: 800, name: "Harpreet Singh" },
  { status: "NEW", hoursAgo: 20, from: ["Pune", "Maharashtra"], to: ["Hyderabad", "Telangana"], material: "FROZEN", kg: 36000, name: "Amit Kulkarni", email: "amit.kulkarni@frostbiteicecream.example", pickupInDays: 5,
    notes: "Ice cream. Unloading at two cold stores in Hyderabad." },
  { status: "NEW", hoursAgo: 26, from: ["Baddi", "Himachal Pradesh"], to: ["Lucknow", "Uttar Pradesh"], material: "CHILLED", kg: 300, name: "Neha Verma", email: "neha.verma@zenithpharma.example",
    notes: "Pharma cartons, 2 to 8 °C." },

  // Contacted
  { status: "CONTACTED", hoursAgo: 30, from: ["Nashik", "Maharashtra"], to: ["Delhi", "Delhi"], material: "CHILLED", kg: 8500, name: "Sachin Pawar", pickupInDays: 4,
    notes: "Grapes from the pack house.",
    note: "Called. Wants a 9 t vehicle on Thursday. Checking for a return load from Azadpur." },
  { status: "CONTACTED", hoursAgo: 40, from: ["Kochi", "Kerala"], to: ["Bengaluru", "Karnataka"], material: "FROZEN", kg: 6200, name: "Anil Thomas", email: "anil@malabarseafoods.example",
    note: "Spoke to Anil. Needs −20 °C, will send the packing list on WhatsApp." },
  { status: "CONTACTED", hoursAgo: 50, from: ["Indore", "Madhya Pradesh"], to: ["Ahmedabad", "Gujarat"], material: "AMBIENT", kg: 12000, name: "Vikas Jain", pickupInDays: 6 },
  { status: "CONTACTED", hoursAgo: 60, from: ["Srinagar", "Jammu and Kashmir"], to: ["Azadpur", "Delhi"], material: "CHILLED", kg: 15500, name: "Bilal Ahmad", pickupInDays: 3,
    notes: "Apples, 16 kg boxes.",
    note: "Road closure on the highway this week. Told him we will confirm the vehicle once it reopens." },
  { status: "CONTACTED", hoursAgo: 70, from: ["Chennai", "Tamil Nadu"], to: ["Coimbatore", "Tamil Nadu"], material: "FROZEN", kg: 1200, name: "Karthik Subramanian", email: "karthik@southernfrozen.example" },

  // Quoted
  { status: "QUOTED", hoursAgo: 75, from: ["Vadodara", "Gujarat"], to: ["Pune", "Maharashtra"], material: "CHILLED", kg: 4000, name: "Jignesh Shah", pickupInDays: 2, quote: 38500 },
  { status: "QUOTED", hoursAgo: 80, from: ["Hyderabad", "Telangana"], to: ["Visakhapatnam", "Andhra Pradesh"], material: "FROZEN", kg: 9000, name: "Lakshmi Reddy", email: "lakshmi@deccanfoods.example", pickupInDays: 4, quote: 52000 },
  { status: "QUOTED", hoursAgo: 96, from: ["Karnal", "Haryana"], to: ["Mumbai", "Maharashtra"], material: "CHILLED", kg: 22000, name: "Deepak Malik", quote: 118000,
    note: "Quoted 1.18 lakh all in. He is comparing with one more transporter, call back on Monday." },
  { status: "QUOTED", hoursAgo: 100, from: ["Kolkata", "West Bengal"], to: ["Guwahati", "Assam"], material: "FROZEN", kg: 16000, name: "Sourav Ghosh", email: "sourav.ghosh@eastcoastfrozen.example", pickupInDays: 7, quote: 96000 },
  { status: "QUOTED", hoursAgo: 120, from: ["Noida", "Uttar Pradesh"], to: ["Dehradun", "Uttarakhand"], material: "AMBIENT", kg: 2400, name: "Pooja Agarwal", quote: 14500 },
  { status: "QUOTED", hoursAgo: 130, from: ["Mumbai", "Maharashtra"], to: ["Panaji", "Goa"], material: "FROZEN", kg: 350, name: "Francis D'Souza", email: "francis@goabeachcafe.example", quote: 6500,
    notes: "Frozen desserts for a restaurant. Happy to share a vehicle." },

  // Confirmed
  { status: "CONFIRMED", hoursAgo: 140, from: ["Amritsar", "Punjab"], to: ["Delhi", "Delhi"], material: "CHILLED", kg: 7000, name: "Gurpreet Kaur", pickupInDays: 1, quote: 31000,
    note: "Advance received. Vehicle placed for 6 am loading." },
  { status: "CONFIRMED", hoursAgo: 150, from: ["Nellore", "Andhra Pradesh"], to: ["Chennai", "Tamil Nadu"], material: "FROZEN", kg: 18500, name: "Venkat Rao", email: "venkat@coastalaqua.example", pickupInDays: 2, quote: 44000 },
  { status: "CONFIRMED", hoursAgo: 170, from: ["Mehsana", "Gujarat"], to: ["Jaipur", "Rajasthan"], material: "CHILLED", kg: 9000, name: "Bhavesh Chaudhary", pickupInDays: 3, quote: 47500 },
  { status: "CONFIRMED", hoursAgo: 180, from: ["Bengaluru", "Karnataka"], to: ["Kochi", "Kerala"], material: "AMBIENT", kg: 5000, name: "Divya Menon", email: "divya.menon@spicetrail.example", pickupInDays: 1, quote: 29000 },
  { status: "CONFIRMED", hoursAgo: 200, from: ["Okhla", "Delhi"], to: ["Chandigarh", "Chandigarh"], material: "FROZEN", kg: 2500, name: "Mohit Arora", pickupInDays: 2, quote: 16000 },

  // Completed
  { status: "COMPLETED", hoursAgo: 240, from: ["Anand", "Gujarat"], to: ["Delhi", "Delhi"], material: "CHILLED", kg: 16000, name: "Hetal Patel", email: "hetal@anandmilkfoods.example", pickupInDays: -7, quote: 88000,
    note: "Delivered on time. POD received, invoice sent." },
  { status: "COMPLETED", hoursAgo: 288, from: ["Visakhapatnam", "Andhra Pradesh"], to: ["Hyderabad", "Telangana"], material: "FROZEN", kg: 22000, name: "Ramesh Naidu", pickupInDays: -9, quote: 74000 },
  { status: "COMPLETED", hoursAgo: 336, from: ["Shimla", "Himachal Pradesh"], to: ["Azadpur", "Delhi"], material: "CHILLED", kg: 9000, name: "Rohit Thakur", email: "rohit@himfreshorchards.example", pickupInDays: -11, quote: 36500 },
  { status: "COMPLETED", hoursAgo: 408, from: ["Mumbai", "Maharashtra"], to: ["Ahmedabad", "Gujarat"], material: "FROZEN", kg: 4000, name: "Farhan Shaikh", pickupInDays: -14, quote: 27000 },
  { status: "COMPLETED", hoursAgo: 480, from: ["Ludhiana", "Punjab"], to: ["Kolkata", "West Bengal"], material: "AMBIENT", kg: 21500, name: "Harpreet Singh", pickupInDays: -17, quote: 142000,
    note: "Unloading was delayed half a day at the consignee. No detention charged this time." },
  { status: "COMPLETED", hoursAgo: 552, from: ["Pune", "Maharashtra"], to: ["Bengaluru", "Karnataka"], material: "CHILLED", kg: 44000, name: "Amit Kulkarni", email: "amit.kulkarni@frostbiteicecream.example", pickupInDays: -20, quote: 210000 },
  { status: "COMPLETED", hoursAgo: 648, from: ["Lucknow", "Uttar Pradesh"], to: ["Patna", "Bihar"], material: "FROZEN", kg: 1500, name: "Imran Khan", pickupInDays: -24, quote: 21000 },

  // Lost
  { status: "LOST", hoursAgo: 216, from: ["Jaipur", "Rajasthan"], to: ["Mumbai", "Maharashtra"], material: "CHILLED", kg: 6500, name: "Manoj Sharma", quote: 68000,
    note: "Went with another transporter. Our rate was about 6,000 higher." },
  { status: "LOST", hoursAgo: 360, from: ["Coimbatore", "Tamil Nadu"], to: ["Hyderabad", "Telangana"], material: "FROZEN", kg: 3000, name: "Senthil Kumar", email: "senthil@kovaifoods.example",
    note: "Buyer cancelled the order before we quoted." },
  { status: "LOST", hoursAgo: 504, from: ["Bhubaneswar", "Odisha"], to: ["Kolkata", "West Bengal"], material: "AMBIENT", kg: 1000, name: "Pradeep Mohanty", quote: 12500 },

  // Spam
  { status: "SPAM", hoursAgo: 45, from: ["Delhi", "Delhi"], to: ["Delhi", "Delhi"], material: "AMBIENT", kg: 10, name: "Test Test", notes: "test" },
  { status: "SPAM", hoursAgo: 264, from: ["Mumbai", "Maharashtra"], to: ["Mumbai", "Maharashtra"], material: "FROZEN", kg: 50000, name: "SEO Services", email: "sales@rankfast.example",
    notes: "We offer website ranking services at low cost. Reply for a free audit." },
];

/** The stages a request went through to reach each status. */
const STAGES: Record<QuoteStatusId, QuoteStatusId[]> = {
  NEW: [],
  CONTACTED: ["CONTACTED"],
  QUOTED: ["CONTACTED", "QUOTED"],
  CONFIRMED: ["CONTACTED", "QUOTED", "CONFIRMED"],
  COMPLETED: ["CONTACTED", "QUOTED", "CONFIRMED", "COMPLETED"],
  LOST: ["CONTACTED", "QUOTED", "LOST"],
  SPAM: ["SPAM"],
};

/** Hours after the request came in that it reached each stage. */
const STAGE_HOURS: Record<QuoteStatusId, number> = {
  NEW: 0,
  CONTACTED: 2,
  QUOTED: 5,
  CONFIRMED: 26,
  COMPLETED: 96,
  LOST: 50,
  SPAM: 1,
};

type TimelineEntry = {
  type: "NOTE" | "STATUS_CHANGE" | "PRICE_CHANGE" | "NOTIFICATION";
  body: string;
  authorId?: string;
  createdAt: Date;
};

const CUSTOMERS = [...new Set(SAMPLES.map((sample) => sample.name))];

/** A made-up number in an obviously fake range. A returning customer keeps the same one. */
function phoneFor(name: string): string {
  return `+91900000${1001 + CUSTOMERS.indexOf(name)}`;
}

// The alphabet of src/lib/reference.ts, which is server-only and cannot be imported here.
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/** A fixed reference per sample, so they stay the same from one run to the next. */
function referenceFor(index: number): string {
  // The multiplier shares no factor with 30^6, so every index gives a different code.
  let value = ((index + 1) * 104_729_683) % 30 ** 6;
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += REFERENCE_ALPHABET[value % 30];
    value = Math.floor(value / 30);
  }
  return `BR-${code}`;
}

/** The entries the app itself would have written, worded the same way. */
function timelineFor(sample: Sample, receivedAt: number, adminId: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      type: "NOTIFICATION",
      body: `New-request alert emailed to ${DEFAULT_BUSINESS.email}`,
      createdAt: new Date(receivedAt + 4_000),
    },
  ];
  if (sample.email) {
    entries.push({
      type: "NOTIFICATION",
      body: `Confirmation emailed to ${sample.email}`,
      createdAt: new Date(receivedAt + 5_000),
    });
  }

  const { quote } = sample;
  let previous: QuoteStatusId = "NEW";
  let at = receivedAt;
  for (const stage of STAGES[sample.status]) {
    // A request lost before it was quoted skips that stage.
    if (stage === "QUOTED" && quote === undefined) continue;

    at = receivedAt + STAGE_HOURS[stage] * HOUR_MS;
    entries.push({
      type: "STATUS_CHANGE",
      body: `Status changed from ${STATUS_LABELS[previous]} to ${STATUS_LABELS[stage]}`,
      authorId: adminId,
      createdAt: new Date(at),
    });
    if (stage === "QUOTED" && quote !== undefined) {
      entries.push({
        type: "PRICE_CHANGE",
        body: `Quote set to ${formatInr(quote)}`,
        authorId: adminId,
        createdAt: new Date(at),
      });
    }
    previous = stage;
  }

  if (sample.note) {
    entries.push({
      type: "NOTE",
      body: sample.note,
      authorId: adminId,
      createdAt: new Date(at + 2 * 60_000),
    });
  }
  return entries;
}

function quoteFor(
  sample: Sample,
  index: number,
  adminId: string,
  now: number,
): Prisma.QuoteRequestCreateInput {
  const plan = planTrucks(sample.kg, DEFAULT_FLEET);
  if (!plan) throw new Error(`Sample ${index + 1} has a weight the quote form would not accept.`);

  const receivedAt = now - sample.hoursAgo * HOUR_MS;
  const timeline = timelineFor(sample, receivedAt, adminId);

  return {
    reference: referenceFor(index),
    status: sample.status,
    originCity: sample.from[0],
    originState: sample.from[1],
    destinationCity: sample.to[0],
    destinationState: sample.to[1],
    material: sample.material,
    quantityKg: sample.kg,
    loadType: plan.loadType,
    truckPlan: plan.trucks,
    pickupDate:
      sample.pickupInDays === undefined
        ? null
        : new Date(`${dateInIndia(sample.pickupInDays)}T00:00:00Z`),
    notes: sample.notes ?? null,
    contactName: sample.name,
    phone: phoneFor(sample.name),
    email: sample.email ?? null,
    quotedAmount: sample.quote ?? null,
    userAgent: SEED_MARKER,
    createdAt: new Date(receivedAt),
    updatedAt: timeline[timeline.length - 1].createdAt,
    activities: { create: timeline },
  };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) fail("DATABASE_URL is not set. See .env.example.");

  // A known, short password must never reach a database other people can get to.
  const { hostname } = new URL(connectionString);
  if (!LOCAL_HOSTS.includes(hostname)) {
    fail(`Not seeding ${hostname}: this script is for a database on your own machine.`);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const passwordHash = await hashPassword(ADMIN.password);
    const admin = await prisma.adminUser.upsert({
      where: { email: ADMIN.email },
      create: {
        email: ADMIN.email,
        name: ADMIN.name,
        passwordHash,
        role: "ADMIN",
        promoCode: await choosePromoCode(ADMIN.name, ADMIN.email, async (codes) =>
          (await prisma.adminUser.findMany({ where: { promoCode: { in: codes } }, select: { promoCode: true } })).map(
            (row) => row.promoCode,
          ),
        ),
      },
      update: { passwordHash, role: "ADMIN", disabledAt: null },
    });

    const now = Date.now();
    await prisma.$transaction([
      prisma.quoteRequest.deleteMany({ where: { userAgent: SEED_MARKER } }),
      ...SAMPLES.map((sample, index) =>
        prisma.quoteRequest.create({ data: quoteFor(sample, index, admin.id, now) }),
      ),
    ]);

    console.log(`Seeded ${SAMPLES.length} quote requests.`);
    console.log(`Sign in at /desk as ${ADMIN.email} with the password "${ADMIN.password}".`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
