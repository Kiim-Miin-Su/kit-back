import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthSessionRepository } from "./auth-session.repository";
import { AuthSessionDatabase } from "./auth.types";

@Injectable()
export class PrismaAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async read(): Promise<AuthSessionDatabase> {
    const sessions = await this.prisma.authRefreshSession.findMany({
      orderBy: [{ createdAt: "asc" }, { sessionId: "asc" }],
    });

    return {
      sessions: sessions.map((session) => ({
        sessionId: session.sessionId,
        userId: session.userId,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: session.revokedAt?.toISOString(),
      })),
    };
  }

  async write(database: AuthSessionDatabase): Promise<void> {
    await this.prisma.$transaction(
      database.sessions.map((session) =>
        this.prisma.authRefreshSession.upsert({
          where: { sessionId: session.sessionId },
          create: {
            sessionId: session.sessionId,
            userId: session.userId,
            createdAt: new Date(session.createdAt),
            expiresAt: new Date(session.expiresAt),
            revokedAt: session.revokedAt ? new Date(session.revokedAt) : undefined,
          },
          update: {
            userId: session.userId,
            expiresAt: new Date(session.expiresAt),
            revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
          },
        }),
      ),
    );
  }
}
