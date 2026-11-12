
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const rows = await sql`
  SELECT id, name, price, stock, created_at
  FROM products
  ORDER BY created_at DESC
`;

console.log("Products found:", rows.length);
console.table(rows);
