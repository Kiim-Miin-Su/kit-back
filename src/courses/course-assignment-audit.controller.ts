import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "../admin/admin.service";

@Controller("courses")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class CourseAssignmentAuditController {
  constructor(private readonly adminService: AdminService) {}

  @Get(":courseId/assignment-audit")
  getCourseAssignmentAudit(@Param("courseId") courseId: string) {
    return this.adminService.getCourseAssignmentAudit(courseId);
  }
}
