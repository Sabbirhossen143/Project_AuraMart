
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord extends User {
  PK: string;
  SK: string;
  entityType: "USER";
}

export type SafeUser = Omit<User, "password">;
