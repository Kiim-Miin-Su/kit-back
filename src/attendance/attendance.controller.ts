import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AttendanceService } from "./attendance.service";
import { CheckInDto } from "./dto/check-in.dto";

@ApiTags("attendance")
@ApiBearerAuth()
@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("me/attendance/workspace")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "나의 출석 워크스페이스 조회", description: "수강 중인 강의의 출석 일정 목록과 체크인 상태를 반환합니다." })
  @ApiResponse({ status: 200, description: "출석 워크스페이스 반환" })
  async getWorkspace(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.attendanceService.getWorkspace(user.userId);
  }

  @Post("attendance/check-in")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "출석 체크인", description: "코드 인증으로 출석을 처리합니다. 출석 창 시작 10분 초과 시 LATE로 마킹됩니다." })
  @ApiResponse({ status: 201, description: "체크인 결과 (attendanceStatus: CHECKED_IN | LATE)" })
  @ApiResponse({ status: 400, description: "일정 없음(SCHEDULE_NOT_FOUND), 코드 불일치(INVALID_CODE), 이미 체크인(ALREADY_CHECKED_IN), 출석 창 종료(ATTENDANCE_WINDOW_CLOSED)" })
  async checkIn(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CheckInDto,
  ) {
    return this.attendanceService.checkIn(user.userId, body.scheduleId, body.code);
  }
}
