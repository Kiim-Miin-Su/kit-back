import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "../admin/admin.service";

@ApiTags("courses")
@ApiBearerAuth()
@Controller("courses")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin", "instructor", "assistant")
export class CourseAssignmentAuditController {
  constructor(private readonly adminService: AdminService) {}

  @Get(":courseId/assignment-audit")
  @ApiOperation({ summary: "수업별 과제 감사로그 조회", description: "제출·리뷰·피드백 이벤트를 최신순으로 반환합니다. 강사/조교/관리자 전용." })
  @ApiResponse({ status: 200, description: "감사로그 이벤트 목록" })
  @ApiResponse({ status: 404, description: "수업 없음 (COURSE_NOT_FOUND)" })
  getCourseAssignmentAudit(@Param("courseId") courseId: string) {
    return this.adminService.getCourseAssignmentAudit(courseId);
  }
}
