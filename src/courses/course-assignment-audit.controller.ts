import { Controller, Get, Param } from "@nestjs/common";
import { AdminService } from "../admin/admin.service";

@Controller("courses")
export class CourseAssignmentAuditController {
  constructor(private readonly adminService: AdminService) {}

  @Get(":courseId/assignment-audit")
  getCourseAssignmentAudit(@Param("courseId") courseId: string) {
    return this.adminService.getCourseAssignmentAudit(courseId);
  }
}
