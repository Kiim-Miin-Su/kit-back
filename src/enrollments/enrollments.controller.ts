import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { UpdateEnrollmentDto } from "./dto/update-enrollment.dto";
import { EnrollmentsService } from "./enrollments.service";

@ApiTags("enrollments")
@ApiBearerAuth("access-token")
@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post("enrollments")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "수강 신청" })
  async createEnrollment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.createEnrollment(user.userId, body);
  }

  @Get("me/enrollments")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "내 수강 목록" })
  async getMyEnrollments(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.enrollmentsService.listMyEnrollments(user.userId);
  }

  @Get("me/courses")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "내 수강 강좌 목록" })
  async getMyCourses(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.enrollmentsService.listMyCourses(user.userId);
  }

  @Patch("enrollments/:enrollmentId")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "수강 상태 변경" })
  async updateEnrollment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("enrollmentId") enrollmentId: string,
    @Body() body: UpdateEnrollmentDto,
  ) {
    return this.enrollmentsService.updateEnrollment(user.userId, enrollmentId, body);
  }

  @Delete("enrollments/:enrollmentId")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "수강 취소" })
  async deleteEnrollment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("enrollmentId") enrollmentId: string,
  ) {
    return this.enrollmentsService.deleteEnrollment(user.userId, enrollmentId);
  }
}
