import { Injectable } from "@nestjs/common";
import { AuthSessionDatabase } from "./auth.types";
import { AuthSessionRepository } from "./auth-session.repository";

@Injectable()
export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  private database: AuthSessionDatabase = {
    sessions: [],
  };

  read(): AuthSessionDatabase {
    return this.clone(this.database);
  }

  write(database: AuthSessionDatabase): void {
    this.database = this.clone(database);
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
