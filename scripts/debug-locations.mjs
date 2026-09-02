// Run with: node scripts/debug-locations.mjs
//
// Prints the RAW slug values for every location and workspace, including
// their length and character codes, so invisible characters (extra spaces,
// non-breaking spaces, different dash characters, etc.) that look identical
// in the admin UI but fail a strict `===` comparison become visible.
//
// Requires DATABASE_URL to be set (already present in .env for this project).

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function inspect(label, value) {
  const str = value ?? "";
  const codes = [...str].map((ch) => ch.charCodeAt(0)).join(",");
  console.log(`${label}: ${JSON.stringify(str)}  (length=${str.length}, charCodes=[${codes}])`);
}

async function main() {
  const locations = await db.location.findMany({
    select: { id: true, name: true, slug: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  const workspaces = await db.workspace.findMany({
    select: { id: true, name: true, locationSlug: true, availability: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n=== LOCATIONS (${locations.length}) ===`);
  for (const l of locations) {
    console.log(`\n- ${l.name} [status=${l.status}]`);
    inspect("  slug", l.slug);
  }

  console.log(`\n=== WORKSPACES (${workspaces.length}) ===`);
  for (const w of workspaces) {
    console.log(`\n- ${w.name} [availability=${w.availability}]`);
    inspect("  locationSlug", w.locationSlug);
  }

  console.log("\n=== MATCH CHECK ===");
  for (const w of workspaces) {
    const match = locations.find((l) => l.slug === w.locationSlug);
    console.log(
      `${w.name}: locationSlug=${JSON.stringify(w.locationSlug)} -> ${
        match ? `MATCHES "${match.name}"` : "NO MATCH (this is the bug)"
      }`,
    );
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
