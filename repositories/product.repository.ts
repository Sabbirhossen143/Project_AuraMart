
import { sql } from "@/lib/db";
import type { Product } from "@/types/product";
import { getCategoryById } from "@/repositories/category.repository";

// ============================================
// Database Row Type
// ============================================

interface ProductRow {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  price: string | number;
  discount_percent: string | number | null;
  stock: number;
  category_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

// ============================================
// Helper: Map Database Row
// ============================================

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url ?? undefined,
    price: Number(row.price),
    discountPercent:
      row.discount_percent === null
        ? undefined
        : Number(row.discount_percent),
    stock: Number(row.stock),
    categoryId: row.category_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// ============================================
// Validate Category
// ============================================

async function validateCategory(categoryId: string) {
  const category = await getCategoryById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  if (!category.isActive) {
    throw new Error("This category is inactive.");
  }

  return category;
}

// ============================================
// Create Product
// ============================================

export async function createProduct(
  product: Product
): Promise<Product> {
  await validateCategory(product.categoryId);

  const result = await sql`
    INSERT INTO products (
      id,
      name,
      description,
      image_url,
      price,
      discount_percent,
      stock,
      category_id,
      created_at,
      updated_at
    )
    VALUES (
      ${product.id},
      ${product.name},
      ${product.description},
      ${product.imageUrl ?? null},
      ${product.price},
      ${product.discountPercent ?? null},
      ${product.stock},
      ${product.categoryId},
      ${product.createdAt},
      ${product.updatedAt}
    )
    RETURNING *
  `;

  return mapProduct(result[0] as ProductRow);
}

// ============================================
// Get Product By ID
// ============================================

export async function getProductById(
  id: string
): Promise<Product | null> {
  const result = await sql`
    SELECT *
    FROM products
    WHERE id = ${id}
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return mapProduct(result[0] as ProductRow);
}

// ============================================
// Get All Products
// ============================================

export async function getAllProducts(
  limit = 20
): Promise<Product[]> {
  const result = await sql`
    SELECT *
    FROM products
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.map((row) =>
    mapProduct(row as ProductRow)
  );
}

// ============================================
// Get Products By Category
// ============================================

export async function getProductsByCategory(
  categoryId: string,
  limit = 20
): Promise<Product[]> {
  const result = await sql`
    SELECT *
    FROM products
    WHERE category_id = ${categoryId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.map((row) =>
    mapProduct(row as ProductRow)
  );
}

// ============================================
// Update Product
// ============================================

export async function updateProduct(
  id: string,
  updates: Partial<
    Pick<
      Product,
      | "name"
      | "description"
      | "imageUrl"
      | "price"
      | "stock"
      | "categoryId"
      | "discountPercent"
    >
  >
): Promise<Product> {
  const allowedFields = [
    "name",
    "description",
    "imageUrl",
    "price",
    "discountPercent",
    "stock",
    "categoryId",
  ] as const;

  const updateEntries = Object.entries(updates).filter(
    ([key, value]) =>
      allowedFields.includes(
        key as (typeof allowedFields)[number]
      ) && value !== undefined
  );

  if (updateEntries.length === 0) {
    throw new Error("No valid fields provided for update.");
  }

  // Validate category if it changes
  const categoryUpdate = updateEntries.find(
    ([key]) => key === "categoryId"
  );

  if (categoryUpdate) {
    await validateCategory(String(categoryUpdate[1]));
  }

  const columnMap: Record<string, string> = {
    name: "name",
    description: "description",
    imageUrl: "image_url",
    price: "price",
    discountPercent: "discount_percent",
    stock: "stock",
    categoryId: "category_id",
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of updateEntries) {
    const column = columnMap[key];

    values.push(value === "" && key === "imageUrl" ? null : value);

    setClauses.push(
      `${column} = $${values.length}`
    );
  }

  values.push(new Date().toISOString());
  setClauses.push(`updated_at = $${values.length}`);

  values.push(id);

  const query = `
    UPDATE products
    SET ${setClauses.join(", ")}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await sql.query(
    query,
    values
  );

  if (result.length === 0) {
    throw new Error("Product not found.");
  }

  return mapProduct(result[0] as ProductRow);
}

// ============================================
// Delete Product
// ============================================

export async function deleteProduct(
  id: string
): Promise<{ id: string }> {
  const result = await sql`
    DELETE FROM products
    WHERE id = ${id}
    RETURNING id
  `;

  if (result.length === 0) {
    throw new Error("Product not found.");
  }

  return { id: result[0].id as string };
}
