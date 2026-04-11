import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AssignmentsService } from "./assignments.service";
import { AddSubmissionFeedbackDto } from "./dto/add-submission-feedback.dto";
import { CreateInstructorAssignmentDto } from "./dto/create-instructor-assignment.dto";
import { UpdateInstructorAssignmentDto } from "./dto/update-instructor-assignment.dto";
import { UpdateSubmissionReviewStatusDto } from "./dto/update-submission-review-status.dto";
import { UpsertAssignmentTemplateDto } from "./dto/upsert-assignment-template.dto";

@ApiTags("instructor / assignments")
@ApiBearerAuth()
@Controller("instructor/assignments")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin", "instructor", "assistant")
export class InstructorAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get("workspace")
  getWorkspace() {
    return this.assignmentsService.getInstructorWorkspace();
  }

  @Post()
  createAssignment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateInstructorAssignmentDto,
  ) {
    return this.assignmentsService.createInstructorAssignment({
      ...body,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role.toUpperCase() as import("./assignment.types").AssignmentActorRole,
    });
  }

  @Patch(":assignmentId")
  updateAssignment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("assignmentId") assignmentId: string,
    @Body() body: UpdateInstructorAssignmentDto,
  ) {
    return this.assignmentsService.updateInstructorAssignment(assignmentId, {
      ...body,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role.toUpperCase() as import("./assignment.types").AssignmentActorRole,
    });
  }

  @Put(":assignmentId/template")
  upsertAssignmentTemplate(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("assignmentId") assignmentId: string,
    @Body() body: UpsertAssignmentTemplateDto,
  ) {
    return this.assignmentsService.upsertAssignmentTemplate(assignmentId, {
      ...body,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role.toUpperCase() as import("./assignment.types").AssignmentActorRole,
    });
  }

  @Patch("submissions/:submissionId")
  updateSubmissionReviewStatus(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("submissionId") submissionId: string,
    @Body() body: UpdateSubmissionReviewStatusDto,
  ) {
    return this.assignmentsService.updateSubmissionReviewStatus(submissionId, {
      ...body,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role.toUpperCase() as import("./assignment.types").AssignmentActorRole,
    });
  }

  @Post("submissions/:submissionId/feedback")
  addSubmissionFeedback(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("submissionId") submissionId: string,
    @Body() body: AddSubmissionFeedbackDto,
  ) {
    return this.assignmentsService.addSubmissionFeedback(submissionId, {
      ...body,
      reviewerId: user.userId,
      reviewerName: user.name,
      reviewerRole: user.role.toUpperCase() as import("./assignment.types").AssignmentActorRole,
    });
  }

  @Get(":assignmentId/timeline")
  getAssignmentTimeline(@Param("assignmentId") assignmentId: string) {
    return this.assignmentsService.getAssignmentTimeline(assignmentId);
  }
}
