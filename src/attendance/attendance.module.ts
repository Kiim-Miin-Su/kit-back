import { Module } from "@nestjs/common";
import { isPrismaDataSource } from "../common/data-source";
import { AdminModule } from "../admin/admin.module";
import { CoursesModule } from "../courses/courses.module";
import { EnrollmentsModule } from "../enrollments/enrollments.module";
import { ATTENDANCE_REPOSITORY } from "./attendance.repository";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { InMemoryAttendanceRepository } from "./in-memory-attendance.repository";
import { PrismaAttendanceRepository } from "./prisma-attendance.repository";

@Module({
  imports: [AdminModule, CoursesModule, EnrollmentsModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    {
      provide: ATTENDANCE_REPOSITORY,
      useClass: isPrismaDataSource()
        ? PrismaAttendanceRepository
        : InMemoryAttendanceRepository,
    },
  ],
  exports: [AttendanceService, ATTENDANCE_REPOSITORY],
})
export class AttendanceModule {}
