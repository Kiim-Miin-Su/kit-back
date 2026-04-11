import { Injectable } from "@nestjs/common";
import { scryptSync } from "node:crypto";
import { createFrontAlignedUserSeeds } from "../mock-data/front-aligned.mock";
import { UsersRepository } from "./users.repository";
import { UsersDatabase } from "./users.types";

@Injectable()
export class InMemoryUsersRepository implements UsersRepository {
  private database: UsersDatabase;

  constructor() {
    this.database = {
      users: createFrontAlignedUserSeeds().map((seed) => {
        const passwordSalt = `seed-salt-${seed.userId}`;
        return {
          userId: seed.userId,
          email: seed.email,
          passwordHash: this.derivePasswordHash(seed.password, passwordSalt),
          passwordSalt,
          userName: seed.userName,
          birthDate: seed.birthDate,
          title: seed.title,
          role: seed.role,
          createdAt: seed.createdAt,
          updatedAt: seed.createdAt,
        };
      }),
    };
  }

  read(): UsersDatabase {
    return this.clone(this.database);
  }

  write(database: UsersDatabase): void {
    this.database = this.clone(database);
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private derivePasswordHash(password: string, salt: string) {
    return scryptSync(password, salt, 64).toString("hex");
  }
}
