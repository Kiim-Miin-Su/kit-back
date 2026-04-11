import { AuthSessionDatabase } from "./auth.types";

export const AUTH_SESSION_REPOSITORY = Symbol("AUTH_SESSION_REPOSITORY");

export interface AuthSessionRepository {
  read(): AuthSessionDatabase;
  write(database: AuthSessionDatabase): void;
}
