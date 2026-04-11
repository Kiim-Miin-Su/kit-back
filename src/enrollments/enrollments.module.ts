import { Module } from "@nestjs/common";
import { isPrismaDataSource } from "../common/data-source";
import { CoursesModule } from "../courses/courses.module";
import { UsersModule } from "../users/users.module";
import { ENROLLMENTS_REPOSITORY } from "./enrollments.repository";
import { EnrollmentsController } from "./enrollments.controller";
import { EnrollmentsService } from "./enrollments.service";
import { InMemoryEnrollmentsRepository } from "./in-memory-enrollments.repository";
import { PrismaEnrollmentsRepository } from "./prisma-enrollments.repository";

@Module({
  imports: [CoursesModule, UsersModule],
  controllers: [EnrollmentsController],
  providers: [
    EnrollmentsService,
    {
      provide: ENROLLMENTS_REPOSITORY,
      useClass: isPrismaDataSource()
        ? PrismaEnrollmentsRepository
        : InMemoryEnrollmentsRepository,
    },
  ],
  exports: [EnrollmentsService, ENROLLMENTS_REPOSITORY],
})
export class EnrollmentsModule {}
