import { Module } from "@nestjs/common";
import { isPrismaDataSource } from "../common/data-source";
import { USERS_REPOSITORY } from "./users.repository";
import { InMemoryUsersRepository } from "./in-memory-users.repository";
import { PrismaUsersRepository } from "./prisma-users.repository";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useClass: isPrismaDataSource() ? PrismaUsersRepository : InMemoryUsersRepository,
    },
  ],
  exports: [UsersService, USERS_REPOSITORY],
})
export class UsersModule {}
