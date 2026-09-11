import { Client } from "pg";

// Local-dev-only direct DB access, same reason BE's own tests.helpers/auth.js
// exists: Better Auth requires a verified email before sign-in, and there is
// no email inbox to click a real link, nor (for role) any bootstrap path
// that doesn't already require an admin. Not wired into CI yet
// (development-phases.md Phase 8 notes this as a deliberate follow-up).
const DATABASE_URL =
  process.env["E2E_DATABASE_URL"] ?? "postgresql://terraspace:terraspace@localhost:5433/terraspace";

export async function verifyAndPromote(email: string, role: "customer" | "staff" | "admin") {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `UPDATE users SET email_verified = true, role = $2::user_role WHERE email = $1`,
      [email, role],
    );
  } finally {
    await client.end();
  }
}

export async function deleteTestUser(email: string) {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(`DELETE FROM users WHERE email = $1`, [email]);
  } finally {
    await client.end();
  }
}
