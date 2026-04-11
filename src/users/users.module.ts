import { Module } from "@nestjs/common";
import { USERS_REPOSITORY } from "./users.repository";
import { InMemoryUsersRepository } from "./in-memory-users.repository";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useClass: InMemoryUsersRepository,
    },
  ],
  exports: [UsersService, USERS_REPOSITORY],
})
export class UsersModule {}
