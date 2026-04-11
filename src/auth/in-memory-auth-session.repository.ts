import { Injectable } from "@nestjs/common";
import { AuthSessionDatabase } from "./auth.types";
import { AuthSessionRepository } from "./auth-session.repository";

@Injectable()
export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  private database: AuthSessionDatabase = {
    sessions: [],
  };

  async read(): Promise<AuthSessionDatabase> {
    return this.clone(this.database);
  }

  async write(database: AuthSessionDatabase): Promise<void> {
    this.database = this.clone(database);
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
