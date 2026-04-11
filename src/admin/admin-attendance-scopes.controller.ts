import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { UpdateAttendanceScopesDto } from "./dto/update-attendance-scopes.dto";

@Controller("admin/courses/:courseId")
export class AdminAttendanceScopesController {
  constructor(private readonly adminService: AdminService) {}

  @Get("attendance-scope-workspace")
  getAttendanceScopeWorkspace(@Param("courseId") courseId: string) {
    return this.adminService.getAttendanceScopeWorkspace(courseId);
  }

  @Put("attendance-scopes")
  updateAttendanceScopes(
    @Param("courseId") courseId: string,
    @Body() body: UpdateAttendanceScopesDto,
  ) {
    return this.adminService.updateAttendanceScopes(courseId, body.allowedScheduleScopes);
  }
}
