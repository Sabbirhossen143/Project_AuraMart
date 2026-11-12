
import { sql } from "@/lib/db";
import type { User, SafeUser } from "@/types/user";

type UserRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "USER" | "ADMIN";
  is_active: boolean;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  profile_image: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    isActive: row.is_active,
    phone: row.phone,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    country: row.country,
    profileImage: row.profile_image,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// Create User
export async function createUser(user: User): Promise<User> {
  const normalizedEmail = user.email.trim().toLowerCase();

  const rows = await sql`
    INSERT INTO users (
      id, name, email, password, role, is_active,
      phone, address, city, postal_code, country,
      profile_image, created_at, updated_at
    )
    VALUES (
      ${user.id},
      ${user.name},
      ${normalizedEmail},
      ${user.password},
      ${user.role},
      ${user.isActive},
      ${user.phone ?? null},
      ${user.address ?? null},
      ${user.city ?? null},
      ${user.postalCode ?? null},
      ${user.country ?? null},
      ${user.profileImage ?? null},
      ${user.createdAt},
      ${user.updatedAt}
    )
    RETURNING *
  `;

  return mapUser(rows[0] as UserRow);
}

// Find User By Email
export async function getUserByEmail(
  email: string
): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const rows = await sql`
    SELECT *
    FROM users
    WHERE LOWER(email) = ${normalizedEmail}
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  return mapUser(rows[0] as UserRow);
}

// Find User By ID
export async function getUserById(
  id: string
): Promise<User | null> {
  const rows = await sql`
    SELECT *
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  return mapUser(rows[0] as UserRow);
}

// Get all users for admin
export async function getAllUsers(): Promise<SafeUser[]> {
  const rows = await sql`
    SELECT
      id, name, email, role, is_active,
      phone, address, city, postal_code,
      country, profile_image, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `;

  return rows.map((row) => {
    const user = mapUser({
      ...row,
      password: "",
    } as UserRow);

    const { password, ...safeUser } = user;
    return safeUser;
  });
}

// Update user role
export async function updateUserRole(
  userId: string,
  role: "USER" | "ADMIN"
): Promise<void> {
  const rows = await sql`
    UPDATE users
    SET role = ${role},
        updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id
  `;

  if (rows.length === 0) {
    throw new Error("User not found.");
  }
}

// Activate or deactivate user
export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  const rows = await sql`
    UPDATE users
    SET is_active = ${isActive},
        updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id
  `;

  if (rows.length === 0) {
    throw new Error("User not found.");
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  profile: {
    name: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    profileImage?: string | null;
  }
): Promise<User | null> {
  const hasProfileImage = profile.profileImage !== undefined;

  const rows = await sql`
    UPDATE users
    SET
      name = ${profile.name},
      phone = ${profile.phone},
      address = ${profile.address},
      city = ${profile.city},
      postal_code = ${profile.postalCode},
      country = ${profile.country},
      profile_image = CASE
        WHEN ${hasProfileImage}
        THEN ${profile.profileImage ?? null}
        ELSE profile_image
      END,
      updated_at = NOW()
    WHERE id = ${userId}
      AND is_active = TRUE
    RETURNING *
  `;

  if (rows.length === 0) return null;

  return mapUser(rows[0] as UserRow);
}
