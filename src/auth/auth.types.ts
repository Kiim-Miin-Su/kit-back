import { AppUserRole } from "../users/users.types";

export interface AuthenticatedRequestUser {
  userId: string;
  email: string;
  role: AppUserRole;
  name: string;
}

export interface AuthSessionResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: AppUserRole;
  };
}

export interface AccessTokenPayload {
  type: "access";
  sub: string;
  email: string;
  role: AppUserRole;
  name: string;
  exp: number;
}

export interface RefreshTokenPayload {
  type: "refresh";
  sub: string;
  sessionId: string;
  exp: number;
}

export interface StoredRefreshSession {
  sessionId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface AuthSessionDatabase {
  sessions: StoredRefreshSession[];
}
