
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "USER" | "ADMIN";
  isActive: boolean;

  // Profile information
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  profileImage?: string | null;

  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, "password">;
