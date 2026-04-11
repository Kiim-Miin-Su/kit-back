import { Module } from "@nestjs/common";
import { AdminAttendanceScopesController } from "./admin-attendance-scopes.controller";
import { AdminCoursesController } from "./admin-courses.controller";
import { AdminSchedulesController } from "./admin-schedules.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AdminService } from "./admin.service";

@Module({
  controllers: [
    AdminUsersController,
    AdminCoursesController,
    AdminSchedulesController,
    AdminAttendanceScopesController,
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
