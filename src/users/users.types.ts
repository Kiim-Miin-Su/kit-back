export const appUserRoleValues = ["admin", "instructor", "assistant", "student"] as const;
export type AppUserRole = (typeof appUserRoleValues)[number];

export interface RawUserSeed {
  userId: string;
  email: string;
  password: string;
  userName: string;
  birthDate?: string;
  title: string;
  role: AppUserRole;
  createdAt: string;
}

export interface StoredUserRecord {
  userId: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  userName: string;
  birthDate?: string;
  title: string;
  role: AppUserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UsersDatabase {
  users: StoredUserRecord[];
}

export interface UserProfileResponse {
  userId: string;
  email: string;
  userName: string;
  birthDate?: string;
  role: AppUserRole;
  title: string;
}
