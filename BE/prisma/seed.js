import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { customAlphabet } from "nanoid";
import { faker } from "@faker-js/faker";
import { prisma } from "../src/shared/database/client.js";

// Excludes 0/O/1/I so codes can be read aloud (libraries.md §12).
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const generateCode = customAlphabet(CODE_ALPHABET, 6);
const SEED_PASSWORD = "password123";

faker.seed(1234);

async function seedAdminSettings() {
  await prisma.adminSettings.upsert({
    where: { id: true },
    create: { id: true, currency: "IDR", taxPercent: "11.00" },
    update: { currency: "IDR", taxPercent: "11.00" },
  });
}

/** Creates a user with a working `credential` login — same shape Better Auth itself writes. */
async function createCredentialUser({ name, email, role }) {
  const user = await prisma.user.create({
    data: { id: randomUUID(), name, email, emailVerified: true, role },
  });
  await prisma.account.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: await hashPassword(SEED_PASSWORD),
    },
  });
  return user;
}

async function seedUsers() {
  const admin = await createCredentialUser({
    name: "Admin TerraSpace",
    email: "admin@terraspace.test",
    role: "admin",
  });
  const staff = await createCredentialUser({
    name: "Budi Santoso",
    email: "staff@terraspace.test",
    role: "staff",
  });
  const customers = await Promise.all([
    createCredentialUser({ name: "Ana Putri", email: "ana@example.test", role: "customer" }),
    createCredentialUser({
      name: "Citra Wulandari",
      email: "citra@example.test",
      role: "customer",
    }),
  ]);
  return { admin, staff, customers };
}

async function seedLocations() {
  const jakarta = await prisma.location.create({
    data: {
      slug: "terraspace-jakarta",
      name: "TerraSpace Jakarta",
      address: "Jl. Sudirman 52",
      city: "Jakarta",
      timezone: "Asia/Jakarta",
      latitude: "-6.208800",
      longitude: "106.845600",
      description: "Central Jakarta coworking space, steps from the CBD.",
    },
  });
  const makassar = await prisma.location.create({
    data: {
      slug: "terraspace-makassar",
      name: "TerraSpace Makassar",
      address: "Jl. Boulevard 21",
      city: "Makassar",
      // Deliberately a different zone — Indonesia spans three (erd-spec.md §8).
      timezone: "Asia/Makassar",
      latitude: "-5.147665",
      longitude: "119.432732",
      description: "Waterfront coworking space in Makassar.",
    },
  });
  return [jakarta, makassar];
}

async function seedAmenities() {
  const definitions = [
    { name: "Wi-Fi", nameId: "Wi-Fi", category: "Connectivity", icon: "wifi" },
    { name: "Parking", nameId: "Parkir", category: "Facility", icon: "car" },
    { name: "Projector", nameId: "Proyektor", category: "Equipment", icon: "projector" },
    { name: "Standing Desk", nameId: "Meja Berdiri", category: "Furniture", icon: "desk" },
    { name: "Coffee", nameId: "Kopi", category: "Facility", icon: "coffee" },
    { name: "Whiteboard", nameId: "Papan Tulis", category: "Equipment", icon: "whiteboard" },
  ];
  return Promise.all(definitions.map((data) => prisma.amenity.create({ data })));
}

/** 5 workspaces per location — ~10 total, spanning every workspace_type. */
const WORKSPACE_BLUEPRINTS = [
  { locationIndex: 0, name: "Hot Desk 1", type: "hot_desk", pricePerHour: "12000.00" },
  { locationIndex: 0, name: "Hot Desk 2", type: "hot_desk", pricePerHour: "12000.00" },
  { locationIndex: 0, name: "Dedicated Desk 1", type: "dedicated_desk", pricePerHour: "20000.00" },
  { locationIndex: 0, name: "Private Office 1", type: "private_office", pricePerHour: "80000.00" },
  { locationIndex: 0, name: "Meeting Room A", type: "meeting_room", pricePerHour: "50000.00" },
  { locationIndex: 1, name: "Hot Desk 1", type: "hot_desk", pricePerHour: "10000.00" },
  { locationIndex: 1, name: "Dedicated Desk 1", type: "dedicated_desk", pricePerHour: "18000.00" },
  { locationIndex: 1, name: "Private Office 1", type: "private_office", pricePerHour: "70000.00" },
  { locationIndex: 1, name: "Meeting Room A", type: "meeting_room", pricePerHour: "45000.00" },
  { locationIndex: 1, name: "Event Space", type: "event_space", pricePerHour: "120000.00" },
];

async function seedWorkspaces(locations, amenities) {
  const workspaces = [];
  for (const blueprint of WORKSPACE_BLUEPRINTS) {
    const { locationIndex, ...data } = blueprint;
    const workspace = await prisma.workspace.create({
      data: {
        ...data,
        locationId: locations[locationIndex].id,
        simpleBooking: blueprint.type === "hot_desk",
        floor: String(faker.number.int({ min: 1, max: 5 })),
      },
    });
    const picked = faker.helpers.arrayElements(amenities, 2);
    await prisma.workspaceAmenity.createMany({
      data: picked.map((amenity) => ({ workspaceId: workspace.id, amenityId: amenity.id })),
    });
    workspaces.push(workspace);
  }
  return workspaces;
}

function timeOfDay(hhmm) {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

function diffHours(start, end) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

const BOOKING_SCENARIOS = [
  { start: "09:00", end: "12:00", status: "confirmed", paymentStatus: "paid" },
  { start: "13:00", end: "14:00", status: "pending", paymentStatus: "pending" },
  { start: "15:00", end: "16:30", status: "completed", paymentStatus: "paid" },
  { start: "17:00", end: "18:00", status: "cancelled", paymentStatus: "failed", cancelled: true },
];

/** One sample booking per scenario, each on a different workspace to avoid overlap. */
async function seedBookings(customers, workspaces) {
  const bookingDate = "2026-09-15";

  for (const [index, scenario] of BOOKING_SCENARIOS.entries()) {
    const workspace = workspaces[index];
    const customer = customers[index % customers.length];
    const durationHours = diffHours(scenario.start, scenario.end);
    const unitPrice = Number(workspace.pricePerHour);
    const subtotalAmount = round2(unitPrice * durationHours);
    const taxAmount = round2(subtotalAmount * 0.11);
    const totalAmount = round2(subtotalAmount + taxAmount);
    const reference = `TS-${generateCode()}`;

    await prisma.booking.create({
      data: {
        userId: customer.id,
        workspaceId: workspace.id,
        bookingDate: new Date(`${bookingDate}T00:00:00.000Z`),
        startTime: timeOfDay(scenario.start),
        endTime: timeOfDay(scenario.end),
        unitPrice,
        durationHours,
        subtotalAmount,
        taxAmount,
        totalAmount,
        status: scenario.status,
        paymentStatus: scenario.paymentStatus,
        cancelledAt: scenario.cancelled ? new Date() : null,
        reference,
        accessCode: `${reference}-${generateCode().slice(0, 4)}`,
      },
    });
  }
}

async function main() {
  await seedAdminSettings();
  const { customers } = await seedUsers();
  const locations = await seedLocations();
  const amenities = await seedAmenities();
  const workspaces = await seedWorkspaces(locations, amenities);
  await seedBookings(customers, workspaces);

  // eslint-disable-next-line no-console -- seed scripts run outside the request path; pino is not wired here
  console.log(
    "Seed complete: 1 admin, 1 staff, 2 customers, 2 locations, 10 workspaces, 6 amenities, 4 bookings.",
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console -- see above
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
