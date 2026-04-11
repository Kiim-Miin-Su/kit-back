import { Injectable } from "@nestjs/common";
import { scryptSync } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { UsersRepository } from "./users.repository";
import { AppUserRole, StoredUserRecord, UsersDatabase } from "./users.types";

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async read(): Promise<UsersDatabase> {
    const users = await this.prisma.user.findMany({
      orderBy: [{ createdAt: "asc" }, { userId: "asc" }],
    });

    return {
      users: users.map((user) => ({
        userId: user.userId,
        email: user.email,
        passwordHash: user.passwordHash,
        passwordSalt: user.passwordSalt,
        userName: user.name,
        birthDate: user.birthDate ?? undefined,
        title: user.title,
        role: this.toAppUserRole(user.role),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
    };
  }

  async write(database: UsersDatabase): Promise<void> {
    await this.prisma.$transaction(
      database.users.map((user) =>
        this.prisma.user.upsert({
          where: { userId: user.userId },
          create: {
            userId: user.userId,
            email: user.email,
            passwordHash: user.passwordHash,
            passwordSalt: user.passwordSalt,
            name: user.userName,
            birthDate: user.birthDate,
            title: user.title,
            role: user.role.toUpperCase() as
              | "ADMIN"
              | "INSTRUCTOR"
              | "ASSISTANT"
              | "STUDENT",
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
          update: {
            email: user.email,
            passwordHash: user.passwordHash,
            passwordSalt: user.passwordSalt,
            name: user.userName,
            birthDate: user.birthDate,
            title: user.title,
            role: user.role.toUpperCase() as
              | "ADMIN"
              | "INSTRUCTOR"
              | "ASSISTANT"
              | "STUDENT",
            updatedAt: new Date(user.updatedAt),
          },
        }),
      ),
    );
  }

  derivePasswordHash(password: string, salt: string) {
    return scryptSync(password, salt, 64).toString("hex");
  }

  private toAppUserRole(role: string): AppUserRole {
    return role.toLowerCase() as AppUserRole;
  }
}
