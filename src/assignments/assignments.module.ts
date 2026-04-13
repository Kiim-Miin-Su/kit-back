import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { EnrollmentsModule } from "../enrollments/enrollments.module";
import { FilesModule } from "../files/files.module";
import { ASSIGNMENTS_REPOSITORY } from "./assignment.repository";
import { AssignmentsService } from "./assignments.service";
import { InMemoryAssignmentsRepository } from "./in-memory-assignments.repository";
import { InstructorAssignmentsController } from "./instructor-assignments.controller";
import { MeAssignmentsController } from "./me-assignments.controller";
import { SubmissionsController } from "./submissions.controller";

@Module({
  imports: [AdminModule, FilesModule, EnrollmentsModule],
  controllers: [
    MeAssignmentsController,
    InstructorAssignmentsController,
    SubmissionsController,
  ],
  providers: [
    AssignmentsService,
    {
      provide: ASSIGNMENTS_REPOSITORY,
      useClass: InMemoryAssignmentsRepository,
    },
  ],
})
export class AssignmentsModule {}
