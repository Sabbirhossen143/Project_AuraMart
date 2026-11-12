
import { sql } from "@/lib/db";
import type { Category } from "@/types/category";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    isActive: row.is_active,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// Create Category
export async function createCategory(
  category: Category
): Promise<Category> {
  const rows = await sql`
    INSERT INTO categories (
      id, name, slug, description, image,
      is_active, created_at, updated_at
    )
    VALUES (
      ${category.id},
      ${category.name},
      ${category.slug},
      ${category.description},
      ${category.image},
      ${category.isActive},
      ${category.createdAt},
      ${category.updatedAt}
    )
    RETURNING *
  `;

  return mapCategory(rows[0] as CategoryRow);
}

// Find Category By ID
export async function getCategoryById(
  id: string
): Promise<Category | null> {
  const rows = await sql`
    SELECT *
    FROM categories
    WHERE id = ${id}
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  return mapCategory(rows[0] as CategoryRow);
}

// Get All Categories
export async function getAllCategories(): Promise<Category[]> {
  const rows = await sql`
    SELECT *
    FROM categories
    ORDER BY created_at DESC
  `;

  return rows.map((row) => mapCategory(row as CategoryRow));
}

// Update Category
export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, "id" | "createdAt">>
): Promise<Category> {
  const allowedFields = [
    "name",
    "slug",
    "description",
    "image",
    "isActive",
  ] as const;

  const hasUpdates = allowedFields.some(
    (field) => updates[field] !== undefined
  );

  if (!hasUpdates) {
    throw new Error("No valid fields provided");
  }

  const rows = await sql`
    UPDATE categories
    SET
      name = CASE
        WHEN ${updates.name !== undefined}
        THEN ${updates.name ?? null}
        ELSE name
      END,

      slug = CASE
        WHEN ${updates.slug !== undefined}
        THEN ${updates.slug ?? null}
        ELSE slug
      END,

      description = CASE
        WHEN ${updates.description !== undefined}
        THEN ${updates.description ?? null}
        ELSE description
      END,

      image = CASE
        WHEN ${updates.image !== undefined}
        THEN ${updates.image ?? null}
        ELSE image
      END,

      is_active = CASE
        WHEN ${updates.isActive !== undefined}
        THEN ${updates.isActive ?? null}
        ELSE is_active
      END,

      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  if (rows.length === 0) {
    throw new Error("Category not found.");
  }

  return mapCategory(rows[0] as CategoryRow);
}

// Delete Category
export async function deleteCategory(id: string) {
  const rows = await sql`
    DELETE FROM categories
    WHERE id = ${id}
    RETURNING id
  `;

  if (rows.length === 0) {
    throw new Error("Category not found.");
  }

  return { id: rows[0].id as string };
}
