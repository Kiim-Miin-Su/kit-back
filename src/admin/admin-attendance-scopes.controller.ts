import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "./admin.service";
import { UpdateAttendanceScopesDto } from "./dto/update-attendance-scopes.dto";

@ApiTags("admin")
@ApiBearerAuth("access-token")
@Controller("admin/courses/:courseId")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminAttendanceScopesController {
  constructor(private readonly adminService: AdminService) {}

  @Get("attendance-scope-workspace")
  @ApiOperation({ summary: "수업 출석 범위 워크스페이스" })
  getAttendanceScopeWorkspace(@Param("courseId") courseId: string) {
    return this.adminService.getAttendanceScopeWorkspace(courseId);
  }

  @Put("attendance-scopes")
  @ApiOperation({ summary: "수업 출석 허용 범위 설정" })
  updateAttendanceScopes(
    @Param("courseId") courseId: string,
    @Body() body: UpdateAttendanceScopesDto,
  ) {
    return this.adminService.updateAttendanceScopes(courseId, body.allowedScheduleScopes);
  }
}
