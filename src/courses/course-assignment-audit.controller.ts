import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "../admin/admin.service";

@ApiTags("admin")
@ApiBearerAuth("access-token")
@Controller("courses")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class CourseAssignmentAuditController {
  constructor(private readonly adminService: AdminService) {}

  @Get(":courseId/assignment-audit")
  @ApiOperation({ summary: "수업 과제 감사 로그" })
  getCourseAssignmentAudit(@Param("courseId") courseId: string) {
    return this.adminService.getCourseAssignmentAudit(courseId);
  }
}
