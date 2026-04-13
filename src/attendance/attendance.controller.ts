import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AttendanceService } from "./attendance.service";
import { CheckInDto } from "./dto/check-in.dto";

@ApiTags("attendance")
@ApiBearerAuth("access-token")
@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("me/attendance/workspace")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "출석 워크스페이스 (캘린더 + 스케줄)" })
  async getWorkspace(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.attendanceService.getWorkspace(user.userId);
  }

  @Post("attendance/check-in")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "출석 체크인" })
  async checkIn(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CheckInDto,
  ) {
    return this.attendanceService.checkIn(user.userId, body.scheduleId, body.code);
  }
}
