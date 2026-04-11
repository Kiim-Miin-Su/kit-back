import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { isPrismaDataSource } from "../common/data-source";
import { COURSES_REPOSITORY } from "./courses.repository";
import { CourseAssignmentAuditController } from "./course-assignment-audit.controller";
import { CoursesController } from "./courses.controller";
import { CoursesService } from "./courses.service";
import { InMemoryCoursesRepository } from "./in-memory-courses.repository";
import { PrismaCoursesRepository } from "./prisma-courses.repository";

@Module({
  imports: [AdminModule],
  controllers: [CourseAssignmentAuditController, CoursesController],
  providers: [
    CoursesService,
    {
      provide: COURSES_REPOSITORY,
      useClass: isPrismaDataSource() ? PrismaCoursesRepository : InMemoryCoursesRepository,
    },
  ],
  exports: [CoursesService, COURSES_REPOSITORY],
})
export class CoursesModule {}
