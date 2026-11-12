
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createAdmin() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!process.env.DATABASE_URL || !name || !email || !password) {
    throw new Error(
      "Missing DATABASE_URL, ADMIN_NAME, ADMIN_EMAIL or ADMIN_PASSWORD."
    );
  }

  if (password.length < 8 || password.length > 72) {
    throw new Error("Password must be 8-72 characters.");
  }

  const existing = await pool.query(
    "SELECT id, role FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [email]
  );

  if (existing.rows.length > 0) {
    throw new Error(
      `This email is already registered. Existing role: ${existing.rows[0].role}`
    );
  }

  const id = randomUUID();
  const hashedPassword = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (
      id, name, email, password, role, is_active,
      phone, address, city, postal_code, country,
      profile_image, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, 'ADMIN', TRUE,
      NULL, NULL, NULL, NULL, NULL,
      NULL, NOW(), NOW()
    )`,
    [id, name, email, hashedPassword]
  );

  console.log("Admin account created successfully.");
  console.log("Admin Email:", email);
  console.log("Admin ID:", id);
}

createAdmin()
  .catch((error) => {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
