import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "./admin.service";
import { CreateAdminScheduleDto, UpdateAdminScheduleDto } from "./dto/create-admin-schedule.dto";

@ApiTags("admin / schedules")
@ApiBearerAuth()
@Controller("admin/schedules")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminSchedulesController {
  constructor(private readonly adminService: AdminService) {}

  @Get("workspace")
  @ApiOperation({ summary: "일정 워크스페이스 조회 (일정 목록 + scope 목록)" })
  @ApiResponse({ status: 200, description: "일정 목록과 visibility scope 목록 반환" })
  getWorkspace() {
    return this.adminService.getScheduleWorkspace();
  }

  @Post()
  @ApiOperation({ summary: "일정 생성" })
  @ApiResponse({ status: 201, description: "생성된 일정 반환" })
  @ApiResponse({ status: 400, description: "날짜/scope/출석창 유효성 오류" })
  createSchedule(@Body() body: CreateAdminScheduleDto) {
    return this.adminService.createSchedule(body);
  }

  @Put(":scheduleId")
  @ApiOperation({ summary: "일정 수정" })
  @ApiResponse({ status: 200, description: "수정된 일정 반환" })
  @ApiResponse({ status: 404, description: "일정 없음 (SCHEDULE_NOT_FOUND)" })
  updateSchedule(
    @Param("scheduleId") scheduleId: string,
    @Body() body: UpdateAdminScheduleDto,
  ) {
    return this.adminService.updateSchedule(scheduleId, body);
  }

  @Delete(":scheduleId")
  @HttpCode(204)
  @ApiOperation({ summary: "일정 삭제" })
  @ApiResponse({ status: 204, description: "삭제 성공" })
  @ApiResponse({ status: 404, description: "일정 없음 (SCHEDULE_NOT_FOUND)" })
  async deleteSchedule(@Param("scheduleId") scheduleId: string) {
    await this.adminService.deleteSchedule(scheduleId);
  }
}
