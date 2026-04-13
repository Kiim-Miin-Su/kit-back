import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "./admin.service";
import { CreateAdminScheduleDto, UpdateAdminScheduleDto } from "./dto/create-admin-schedule.dto";

@ApiTags("admin")
@ApiBearerAuth("access-token")
@Controller("admin/schedules")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminSchedulesController {
  constructor(private readonly adminService: AdminService) {}

  @Get("workspace")
  @ApiOperation({ summary: "일정 관리 워크스페이스" })
  getWorkspace() {
    return this.adminService.getScheduleWorkspace();
  }

  @Post()
  @ApiOperation({ summary: "일정 생성" })
  createSchedule(@Body() body: CreateAdminScheduleDto) {
    return this.adminService.createSchedule(body);
  }

  @Put(":scheduleId")
  @ApiOperation({ summary: "일정 수정" })
  updateSchedule(
    @Param("scheduleId") scheduleId: string,
    @Body() body: UpdateAdminScheduleDto,
  ) {
    return this.adminService.updateSchedule(scheduleId, body);
  }

  @Delete(":scheduleId")
  @HttpCode(204)
  @ApiOperation({ summary: "일정 삭제" })
  deleteSchedule(@Param("scheduleId") scheduleId: string) {
    this.adminService.deleteSchedule(scheduleId);
  }
}
