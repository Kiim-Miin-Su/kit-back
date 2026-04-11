import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AttendanceService } from "./attendance.service";
import { CheckInDto } from "./dto/check-in.dto";

@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("me/attendance/workspace")
  @UseGuards(AuthGuard)
  async getWorkspace(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.attendanceService.getWorkspace(user.userId);
  }

  @Post("attendance/check-in")
  @UseGuards(AuthGuard)
  async checkIn(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CheckInDto,
  ) {
    return this.attendanceService.checkIn(user.userId, body.scheduleId, body.code);
  }
}
