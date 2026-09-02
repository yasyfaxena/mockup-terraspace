// Run with: node scripts/fix-orphaned-workspaces.mjs
//
// Finds workspaces whose locationSlug doesn't match any existing location
// (leftover from renames/rebrands done before the location<->workspace
// cascade existed, e.g. old "sattabi-*" slugs surviving the rename to
// "terraspace-*") and relinks them.
//
// Safe-by-design: this only auto-relinks when there is EXACTLY ONE location
// in the database, since in that case there's no ambiguity about which
// location an orphaned workspace should belong to. With more than one
// location it prints the orphaned workspaces and stops without changing
// anything, so you can relink them by hand in Admin > Spaces instead.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const locations = await db.location.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });
  const workspaces = await db.workspace.findMany({
    select: { id: true, name: true, locationSlug: true },
  });

  const validSlugs = new Set(locations.map((l) => l.slug));
  const orphans = workspaces.filter((w) => !validSlugs.has(w.locationSlug));

  if (orphans.length === 0) {
    console.log("No orphaned workspaces found. Nothing to fix.");
    await db.$disconnect();
    return;
  }

  console.log(`Found ${orphans.length} orphaned workspace(s):`);
  for (const w of orphans) {
    console.log(`  - ${w.name} (currently locationSlug="${w.locationSlug}")`);
  }

  if (locations.length !== 1) {
    console.log(
      `\nThere are ${locations.length} locations, so it's ambiguous which one these belong to.`,
    );
    console.log("Relink them manually in Admin > Spaces instead. Nothing was changed.");
    await db.$disconnect();
    return;
  }

  const target = locations[0];
  console.log(`\nRelinking all orphaned workspaces to "${target.name}" (slug="${target.slug}")...`);
  for (const w of orphans) {
    await db.workspace.update({ where: { id: w.id }, data: { locationSlug: target.slug } });
    console.log(`  fixed: ${w.name}`);
  }

  console.log("\nDone. Refresh the site to see the corrected data.");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
