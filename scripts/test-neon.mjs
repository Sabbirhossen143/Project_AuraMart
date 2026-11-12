import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

try {
  const result = await sql`SELECT NOW() AS current_time`;

  console.log("Neon connection successful!");
  console.log("Database time:", result[0].current_time);
} catch (error) {
  console.error("Neon connection failed:", error.message);
  process.exitCode = 1;
}