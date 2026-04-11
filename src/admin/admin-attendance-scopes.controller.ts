import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "./admin.service";
import { UpdateAttendanceScopesDto } from "./dto/update-attendance-scopes.dto";

@ApiTags("admin / attendance scopes")
@ApiBearerAuth()
@Controller("admin/courses/:courseId")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminAttendanceScopesController {
  constructor(private readonly adminService: AdminService) {}

  @Get("attendance-scope-workspace")
  @ApiOperation({ summary: "수업별 출석 scope 워크스페이스 조회", description: "수업이 출석 인증에 허용한 일정 scope 목록을 반환합니다." })
  @ApiResponse({ status: 200, description: "scope 워크스페이스 반환" })
  @ApiResponse({ status: 404, description: "수업 없음 (COURSE_NOT_FOUND)" })
  getAttendanceScopeWorkspace(@Param("courseId") courseId: string) {
    return this.adminService.getAttendanceScopeWorkspace(courseId);
  }

  @Put("attendance-scopes")
  @ApiOperation({ summary: "수업 출석 허용 scope 업데이트", description: "'global'과 해당 classScope는 항상 포함됩니다." })
  @ApiResponse({ status: 200, description: "업데이트된 scope 목록 반환" })
  @ApiResponse({ status: 404, description: "수업 없음 (COURSE_NOT_FOUND)" })
  updateAttendanceScopes(
    @Param("courseId") courseId: string,
    @Body() body: UpdateAttendanceScopesDto,
  ) {
    return this.adminService.updateAttendanceScopes(courseId, body.allowedScheduleScopes);
  }
}
