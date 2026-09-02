import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["src/backend", "src/frontend"];
const MAX_LINES = 400;

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(fullPath)));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

const files = (await Promise.all(ROOTS.map(collect))).flat();
const violations = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  const lines = content.split(/\r?\n/).length - (content.endsWith("\n") ? 1 : 0);
  if (lines > MAX_LINES) violations.push(`${lines}\t${file}`);
}

if (violations.length) {
  console.error(`Files over ${MAX_LINES} lines:`);
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(
  `Structure check passed: ${files.length} frontend/backend files, max ${MAX_LINES} lines.`,
);
