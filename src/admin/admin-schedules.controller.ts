import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { CreateAdminScheduleDto, UpdateAdminScheduleDto } from "./dto/create-admin-schedule.dto";

@Controller("admin/schedules")
export class AdminSchedulesController {
  constructor(private readonly adminService: AdminService) {}

  @Get("workspace")
  getWorkspace() {
    return this.adminService.getScheduleWorkspace();
  }

  @Post()
  createSchedule(@Body() body: CreateAdminScheduleDto) {
    return this.adminService.createSchedule(body);
  }

  @Put(":scheduleId")
  updateSchedule(
    @Param("scheduleId") scheduleId: string,
    @Body() body: UpdateAdminScheduleDto,
  ) {
    return this.adminService.updateSchedule(scheduleId, body);
  }

  @Delete(":scheduleId")
  @HttpCode(204)
  deleteSchedule(@Param("scheduleId") scheduleId: string) {
    this.adminService.deleteSchedule(scheduleId);
  }
}
