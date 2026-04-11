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
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { UpdateEnrollmentDto } from "./dto/update-enrollment.dto";
import { EnrollmentsService } from "./enrollments.service";

@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post("enrollments")
  @UseGuards(AuthGuard)
  async createEnrollment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.createEnrollment(user.userId, body);
  }

  @Get("me/enrollments")
  @UseGuards(AuthGuard)
  async getMyEnrollments(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.enrollmentsService.listMyEnrollments(user.userId);
  }

  @Get("me/courses")
  @UseGuards(AuthGuard)
  async getMyCourses(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.enrollmentsService.listMyCourses(user.userId);
  }

  @Patch("enrollments/:enrollmentId")
  @UseGuards(AuthGuard)
  async updateEnrollment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("enrollmentId") enrollmentId: string,
    @Body() body: UpdateEnrollmentDto,
  ) {
    return this.enrollmentsService.updateEnrollment(user.userId, enrollmentId, body);
  }

  @Delete("enrollments/:enrollmentId")
  @UseGuards(AuthGuard)
  async deleteEnrollment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("enrollmentId") enrollmentId: string,
  ) {
    return this.enrollmentsService.deleteEnrollment(user.userId, enrollmentId);
  }
}
