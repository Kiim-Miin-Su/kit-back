import { Module } from "@nestjs/common";
import { CoursesModule } from "../courses/courses.module";
import { EnrollmentsModule } from "../enrollments/enrollments.module";
import { ATTENDANCE_REPOSITORY } from "./attendance.repository";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { InMemoryAttendanceRepository } from "./in-memory-attendance.repository";

@Module({
  imports: [CoursesModule, EnrollmentsModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    {
      provide: ATTENDANCE_REPOSITORY,
      useClass: InMemoryAttendanceRepository,
    },
  ],
  exports: [AttendanceService, ATTENDANCE_REPOSITORY],
})
export class AttendanceModule {}
