import { AppUserRole } from "../users/users.types";

export interface CookieRequest {
  headers: {
    cookie?: string;
  };
}

export interface CookieResponse {
  cookie: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
    },
  ) => void;
}

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
