import { Global, Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UsersModule } from "../users/users.module";
import { AUTH_SESSION_REPOSITORY } from "./auth-session.repository";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { InMemoryAuthSessionRepository } from "./in-memory-auth-session.repository";
import { RolesGuard } from "./roles.guard";
import { TokenCodecService } from "./token-codec.service";

@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    RolesGuard,
    Reflector,
    TokenCodecService,
    {
      provide: AUTH_SESSION_REPOSITORY,
      useClass: InMemoryAuthSessionRepository,
    },
  ],
  exports: [AuthService, AuthGuard, RolesGuard, TokenCodecService],
})
export class AuthModule {}
