require("reflect-metadata");
const assert = require("node:assert/strict");
const { afterEach, beforeEach, test } = require("node:test");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../dist/app.module");
const { AdminUsersController } = require("../dist/admin/admin-users.controller");
const { AdminCoursesController } = require("../dist/admin/admin-courses.controller");
const { AdminSchedulesController } = require("../dist/admin/admin-schedules.controller");
const { AdminAttendanceScopesController } = require("../dist/admin/admin-attendance-scopes.controller");
const { MeAssignmentsController } = require("../dist/assignments/me-assignments.controller");
const { InstructorAssignmentsController } = require("../dist/assignments/instructor-assignments.controller");
const { SubmissionsController } = require("../dist/assignments/submissions.controller");
const { CourseAssignmentAuditController } = require("../dist/courses/course-assignment-audit.controller");
const { FilesController } = require("../dist/files/files.controller");
const { CreateStudentSubmissionDto } = require("../dist/assignments/dto/create-student-submission.dto");
const {
  UpdateSubmissionReviewStatusDto,
} = require("../dist/assignments/dto/update-submission-review-status.dto");
const { AddSubmissionFeedbackDto } = require("../dist/assignments/dto/add-submission-feedback.dto");
const { CreateAdminCourseDto } = require("../dist/admin/dto/create-admin-course.dto");
const { UpdateCourseMemberRoleDto } = require("../dist/admin/dto/update-course-member-role.dto");
const {
  CreateAdminScheduleDto,
  UpdateAdminScheduleDto,
} = require("../dist/admin/dto/create-admin-schedule.dto");
const { UpdateAttendanceScopesDto } = require("../dist/admin/dto/update-attendance-scopes.dto");
const { PresignFileDto } = require("../dist/files/dto/presign-file.dto");
const { CompleteFileUploadDto } = require("../dist/files/dto/complete-file-upload.dto");

let moduleRef;
let adminUsersController;
let adminCoursesController;
let adminSchedulesController;
let adminAttendanceScopesController;
let meAssignmentsController;
let instructorAssignmentsController;
let submissionsController;
let courseAssignmentAuditController;
let filesController;

beforeEach(async () => {
  moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  adminUsersController = moduleRef.get(AdminUsersController);
  adminCoursesController = moduleRef.get(AdminCoursesController);
  adminSchedulesController = moduleRef.get(AdminSchedulesController);
  adminAttendanceScopesController = moduleRef.get(AdminAttendanceScopesController);
  meAssignmentsController = moduleRef.get(MeAssignmentsController);
  instructorAssignmentsController = moduleRef.get(InstructorAssignmentsController);
  submissionsController = moduleRef.get(SubmissionsController);
  courseAssignmentAuditController = moduleRef.get(CourseAssignmentAuditController);
  filesController = moduleRef.get(FilesController);
});

afterEach(async () => {
  await moduleRef.close();
});

async function toValidatedDto(DtoClass, payload) {
  const dto = plainToInstance(DtoClass, payload);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  assert.equal(
    errors.length,
    0,
    `DTO validation failed: ${JSON.stringify(errors.map((error) => error.property))}`,
  );

  return dto;
}

function getErrorMeta(error) {
  const status = typeof error?.getStatus === "function" ? error.getStatus() : undefined;
  const response = typeof error?.getResponse === "function" ? error.getResponse() : undefined;

  return {
    status,
    code: response?.code,
    response,
  };
}

async function expectHttpError(execute, expectedStatus, expectedCode) {
  try {
    await execute();
    assert.fail(`Expected HttpException status=${expectedStatus} code=${expectedCode}`);
  } catch (error) {
    const meta = getErrorMeta(error);
    assert.equal(meta.status, expectedStatus);
    assert.equal(meta.code, expectedCode);
  }
}

test("front -> back: 관리자 회원검증/멤버배치 흐름", async () => {
  const adminWorkspace = adminUsersController.getWorkspace();

  assert.ok(Array.isArray(adminWorkspace.users));
  assert.ok(Array.isArray(adminWorkspace.courses));
  assert.ok(Array.isArray(adminWorkspace.memberBindings));

  const kimHana = adminWorkspace.users.find((user) => user.userId === "student-kim-hana");
  assert.ok(kimHana);
  assert.equal(kimHana.userName, "김하나");
  assert.equal(kimHana.birthDate, "2001-04-15");

  const searchByExactId = adminUsersController.searchUsers({ query: "student-kim-hana" });
  assert.ok(searchByExactId.users.some((user) => user.userId === "student-kim-hana"));

  const searchByPrefixId = adminUsersController.searchUsers({ query: "student-kim" });
  assert.ok(searchByPrefixId.users.some((user) => user.userId === "student-kim-hana"));

  const searchByName = adminUsersController.searchUsers({ query: "김하나" });
  assert.ok(searchByName.users.some((user) => user.userId === "student-kim-hana"));

  const searchByBirthDate = adminUsersController.searchUsers({ query: "2001-04-15" });
  assert.ok(searchByBirthDate.users.some((user) => user.userId === "student-kim-hana"));

  const searchByUnknown = adminUsersController.searchUsers({ query: "unknown-user-x" });
  assert.equal(searchByUnknown.users.length, 0);

  const upsertMemberInput = await toValidatedDto(UpdateCourseMemberRoleDto, { role: "STUDENT" });
  const upsertMember = adminCoursesController.upsertCourseMemberRole(
    "course-next-ai-lms",
    "student-lee-jisoo",
    upsertMemberInput,
  );
  assert.deepEqual(upsertMember, {
    courseId: "course-next-ai-lms",
    userId: "student-lee-jisoo",
    role: "STUDENT",
  });

  const workspaceAfterUpsert = adminUsersController.getWorkspace();
  assert.ok(
    workspaceAfterUpsert.memberBindings.some(
      (binding) =>
        binding.courseId === "course-next-ai-lms" &&
        binding.userId === "student-lee-jisoo" &&
        binding.role === "STUDENT",
    ),
  );

  adminCoursesController.deleteCourseMember("course-next-ai-lms", "student-lee-jisoo");
  const workspaceAfterDelete = adminUsersController.getWorkspace();
  assert.ok(
    !workspaceAfterDelete.memberBindings.some(
      (binding) =>
        binding.courseId === "course-next-ai-lms" && binding.userId === "student-lee-jisoo",
    ),
  );

  await expectHttpError(
    () =>
      Promise.resolve(
        adminCoursesController.upsertCourseMemberRole(
          "course-next-ai-lms",
          "unknown-user",
          upsertMemberInput,
        ),
      ),
    404,
    "USER_NOT_FOUND",
  );
});

test("front -> back: 과제 제출/리뷰/피드백/감사로그 흐름", async () => {
  const studentWorkspace = meAssignmentsController.getWorkspace({
    studentId: "student-kim-hana",
    studentName: "김하나",
  });
  assert.equal(studentWorkspace.studentId, "student-kim-hana");
  assert.ok(studentWorkspace.assignments.length > 0);

  const targetAssignmentId = "assignment-next-auth-flow";
  const previousRevisions = studentWorkspace.submissions
    .filter((submission) => submission.assignmentId === targetAssignmentId)
    .map((submission) => submission.revision);
  const previousLatestRevision = previousRevisions.length > 0 ? Math.max(...previousRevisions) : 0;

  const createSubmissionInput = await toValidatedDto(CreateStudentSubmissionDto, {
    studentId: "student-kim-hana",
    studentName: "김하나",
    assignmentId: targetAssignmentId,
    editorType: "IDE",
    message: "front-back 통합 테스트용 제출",
    code: "export const smoke = true;",
    codeLanguage: "typescript",
    attachments: [
      {
        id: "file-attachment-1",
        fileName: "will-be-overwritten.md",
        mimeType: "application/octet-stream",
        sizeBytes: 1,
      },
    ],
    enrolledCourseIds: ["course-next-ai-lms", "course-spring-lms-api"],
  });
  const createdSubmission = meAssignmentsController.createSubmission(createSubmissionInput);

  assert.equal(createdSubmission.studentId, "student-kim-hana");
  assert.equal(createdSubmission.assignmentId, targetAssignmentId);
  assert.equal(createdSubmission.courseId, "course-next-ai-lms");
  assert.equal(createdSubmission.reviewStatus, "SUBMITTED");
  assert.equal(createdSubmission.revision, previousLatestRevision + 1);
  assert.equal(createdSubmission.attachments[0].id, "file-attachment-1");
  assert.equal(createdSubmission.attachments[0].fileName, "auth-flow-notes.md");
  assert.equal(createdSubmission.attachments[0].mimeType, "text/markdown");
  assert.equal(createdSubmission.attachments[0].sizeBytes, 2389);

  const instructorWorkspace = instructorAssignmentsController.getWorkspace();
  assert.ok(instructorWorkspace.submissions.some((submission) => submission.id === createdSubmission.id));

  const updateReviewInput = await toValidatedDto(UpdateSubmissionReviewStatusDto, {
    reviewStatus: "NEEDS_REVISION",
    actorId: "instructor-민수-김",
    actorName: "민수 김",
    comment: "보완이 필요합니다.",
  });
  const updatedReview = instructorAssignmentsController.updateSubmissionReviewStatus(
    createdSubmission.id,
    updateReviewInput,
  );
  assert.equal(updatedReview.reviewStatus, "NEEDS_REVISION");

  const addFeedbackInput = await toValidatedDto(AddSubmissionFeedbackDto, {
    reviewerId: "instructor-민수-김",
    reviewerName: "민수 김",
    messageFormat: "TEXT",
    entryType: "GENERAL",
    message: "수정 포인트를 반영해 주세요.",
    code: "",
    codeLanguage: "typescript",
    attachments: [],
    reviewStatus: "REVIEWED",
  });
  const feedbacked = instructorAssignmentsController.addSubmissionFeedback(
    createdSubmission.id,
    addFeedbackInput,
  );
  assert.equal(feedbacked.id, createdSubmission.id);
  assert.equal(feedbacked.reviewStatus, "REVIEWED");
  assert.ok(feedbacked.feedbackHistory.length >= 1);

  const submissionDetail = submissionsController.getSubmissionDetail(createdSubmission.id);
  assert.equal(submissionDetail.submission.id, createdSubmission.id);
  assert.equal(submissionDetail.submission.reviewStatus, "REVIEWED");
  assert.ok(submissionDetail.revisionHistory.some((item) => item.id === createdSubmission.id));
  assert.ok(
    submissionDetail.timeline.some(
      (event) => event.submissionId === createdSubmission.id && event.type === "REVIEW_STATUS_CHANGED",
    ),
  );

  const assignmentTimeline = instructorAssignmentsController.getAssignmentTimeline(
    createdSubmission.assignmentId,
  );
  assert.ok(assignmentTimeline.timeline.some((item) => item.submissionId === createdSubmission.id));
  assert.ok(assignmentTimeline.submissionLabelById[createdSubmission.id]);

  const audit = courseAssignmentAuditController.getCourseAssignmentAudit(createdSubmission.courseId);
  assert.ok(
    audit.some(
      (event) =>
        event.submissionId === createdSubmission.id &&
        (event.action === "SUBMITTED" || event.action === "RESUBMITTED"),
    ),
  );
  assert.ok(
    audit.some(
      (event) => event.submissionId === createdSubmission.id && event.action === "REVIEW_STATUS_CHANGED",
    ),
  );
  assert.ok(
    audit.some((event) => event.submissionId === createdSubmission.id && event.action === "FEEDBACK_ADDED"),
  );

  const notEnrolledInput = await toValidatedDto(CreateStudentSubmissionDto, {
    studentId: "student-kim-hana",
    studentName: "김하나",
    assignmentId: "assignment-next-auth-flow",
    editorType: "IDE",
    message: "수강 외 과목 제출 시도",
    code: "console.log('x')",
    codeLanguage: "typescript",
    attachments: [],
    enrolledCourseIds: ["course-spring-lms-api"],
  });
  await expectHttpError(
    () => Promise.resolve(meAssignmentsController.createSubmission(notEnrolledInput)),
    400,
    "NOT_ENROLLED_COURSE",
  );

  const invalidEmptyInput = await toValidatedDto(CreateStudentSubmissionDto, {
    studentId: "student-kim-hana",
    studentName: "김하나",
    assignmentId: "assignment-next-auth-flow",
    editorType: "IDE",
    message: "   ",
    code: "  ",
    codeLanguage: "typescript",
    attachments: [],
    enrolledCourseIds: ["course-next-ai-lms"],
  });
  await expectHttpError(
    () => Promise.resolve(meAssignmentsController.createSubmission(invalidEmptyInput)),
    400,
    "INVALID_SUBMISSION",
  );

  const missingAttachmentInput = await toValidatedDto(CreateStudentSubmissionDto, {
    studentId: "student-kim-hana",
    studentName: "김하나",
    assignmentId: "assignment-next-auth-flow",
    editorType: "IDE",
    message: "없는 파일 첨부 시도",
    code: "",
    codeLanguage: "typescript",
    attachments: [
      {
        id: "file-does-not-exist",
        fileName: "x.md",
        mimeType: "text/markdown",
        sizeBytes: 10,
      },
    ],
    enrolledCourseIds: ["course-next-ai-lms"],
  });
  await expectHttpError(
    () => Promise.resolve(meAssignmentsController.createSubmission(missingAttachmentInput)),
    400,
    "ATTACHMENT_FILE_NOT_FOUND",
  );

  const pendingAttachmentInput = await toValidatedDto(CreateStudentSubmissionDto, {
    studentId: "student-demo-01",
    studentName: "데모 수강생",
    assignmentId: "assignment-next-course-filter",
    editorType: "IDE",
    message: "pending 파일 첨부 시도",
    code: "const x = 1;",
    codeLanguage: "typescript",
    attachments: [
      {
        id: "file-pending-1",
        fileName: "panel-tests-v4.md",
        mimeType: "text/markdown",
        sizeBytes: 2500,
      },
    ],
    enrolledCourseIds: ["course-next-ai-lms", "course-llm-study-assistant"],
  });
  await expectHttpError(
    () => Promise.resolve(meAssignmentsController.createSubmission(pendingAttachmentInput)),
    400,
    "ATTACHMENT_FILE_NOT_READY",
  );

  const forbiddenAttachmentInput = await toValidatedDto(CreateStudentSubmissionDto, {
    studentId: "student-kim-hana",
    studentName: "김하나",
    assignmentId: "assignment-next-auth-flow",
    editorType: "IDE",
    message: "타인 파일 첨부 시도",
    code: "const y = 2;",
    codeLanguage: "typescript",
    attachments: [
      {
        id: "file-pending-1",
        fileName: "panel-tests-v4.md",
        mimeType: "text/markdown",
        sizeBytes: 2500,
      },
    ],
    enrolledCourseIds: ["course-next-ai-lms", "course-spring-lms-api"],
  });
  await expectHttpError(
    () => Promise.resolve(meAssignmentsController.createSubmission(forbiddenAttachmentInput)),
    400,
    "ATTACHMENT_FILE_FORBIDDEN",
  );
});

test("front -> back: 파일 presign/complete/조회 + 예외 흐름", async () => {
  const presignInput = await toValidatedDto(PresignFileDto, {
    ownerId: "student-kim-hana",
    fileName: "integration-result.md",
    contentType: "text/markdown",
    size: 1024,
    checksum: "d".repeat(64),
  });
  const presign = filesController.presign(presignInput);

  assert.equal(presign.ownerId, "student-kim-hana");
  assert.equal(presign.status, "PENDING");
  assert.ok(presign.uploadUrl.includes("storage.mock.local/upload"));

  const completeInput = await toValidatedDto(CompleteFileUploadDto, {
    fileId: presign.fileId,
    checksum: "d".repeat(64),
    size: 1024,
  });
  const completed = filesController.complete(completeInput);

  assert.equal(completed.fileId, presign.fileId);
  assert.equal(completed.status, "COMPLETED");
  assert.ok(completed.downloadUrl.includes("storage.mock.local/download"));

  const fileMeta = filesController.getFileMetadata(presign.fileId);
  assert.equal(fileMeta.fileId, presign.fileId);
  assert.equal(fileMeta.status, "COMPLETED");
  assert.equal(fileMeta.checksum, "d".repeat(64));
  assert.equal(fileMeta.size, 1024);
  assert.ok(fileMeta.downloadUrl);

  await expectHttpError(
    () => Promise.resolve(filesController.complete(completeInput)),
    409,
    "FILE_UPLOAD_ALREADY_COMPLETED",
  );

  const checksumMismatchPresignInput = await toValidatedDto(PresignFileDto, {
    ownerId: "student-kim-hana",
    fileName: "checksum-target.md",
    contentType: "text/markdown",
    size: 512,
    checksum: "a".repeat(64),
  });
  const checksumMismatchTarget = filesController.presign(checksumMismatchPresignInput);
  const checksumMismatchCompleteInput = await toValidatedDto(CompleteFileUploadDto, {
    fileId: checksumMismatchTarget.fileId,
    checksum: "b".repeat(64),
    size: 512,
  });
  await expectHttpError(
    () => Promise.resolve(filesController.complete(checksumMismatchCompleteInput)),
    400,
    "CHECKSUM_MISMATCH",
  );

  const unsupportedMimeInput = await toValidatedDto(PresignFileDto, {
    ownerId: "student-kim-hana",
    fileName: "integration.bin",
    contentType: "application/octet-stream",
    size: 1024,
    checksum: "e".repeat(64),
  });
  await expectHttpError(
    () => Promise.resolve(filesController.presign(unsupportedMimeInput)),
    400,
    "UNSUPPORTED_MIME_TYPE",
  );

  await expectHttpError(
    () => Promise.resolve(filesController.getFileMetadata("file-not-exists")),
    404,
    "FILE_NOT_FOUND",
  );
});

test("front -> back: 관리자 수업/출석 scope/일정 CRUD 흐름", async () => {
  const createCourseInput = await toValidatedDto(CreateAdminCourseDto, {
    courseTitle: "테스트 코스 운영",
    category: "테스트",
    sectionLabel: "T1",
    roomLabel: "온라인",
    capacity: 10,
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    enrollmentStartDate: "2026-05-20",
    enrollmentEndDate: "2026-05-31",
    pacingType: "INSTRUCTOR_PACED",
  });
  const createdCourse = adminCoursesController.createCourse(createCourseInput);

  assert.ok(createdCourse.courseId);
  assert.ok(createdCourse.classScope);

  const courseId = createdCourse.courseId;
  const classScope = createdCourse.classScope;

  const scopeWorkspace = adminAttendanceScopesController.getAttendanceScopeWorkspace(courseId);
  assert.ok(scopeWorkspace.allowedScheduleScopes.includes("global"));
  assert.ok(scopeWorkspace.allowedScheduleScopes.includes(classScope));

  const updateScopesInput = await toValidatedDto(UpdateAttendanceScopesDto, {
    allowedScheduleScopes: ["ai-product-engineering-3"],
  });
  const updatedScopes = adminAttendanceScopesController.updateAttendanceScopes(
    courseId,
    updateScopesInput,
  );
  assert.ok(updatedScopes.allowedScheduleScopes.includes("global"));
  assert.ok(updatedScopes.allowedScheduleScopes.includes(classScope));
  assert.ok(updatedScopes.allowedScheduleScopes.includes("ai-product-engineering-3"));

  const createScheduleInput = await toValidatedDto(CreateAdminScheduleDto, {
    title: "운영 테스트 일정",
    categoryLabel: "운영",
    dateKey: "2026-06-10",
    timeLabel: "10:00 - 11:00",
    locationLabel: "온라인",
    visibilityType: "class",
    visibilityScope: classScope,
    visibilityLabel: "테스트 코스 운영 수업",
    requiresAttendanceCheck: true,
    attendanceWindowStartAt: "2026-06-10T10:00:00+09:00",
    attendanceWindowEndAt: "2026-06-10T10:15:00+09:00",
  });
  const createdSchedule = adminSchedulesController.createSchedule(createScheduleInput);
  assert.ok(createdSchedule.id);
  assert.equal(createdSchedule.visibilityScope, classScope);

  const scheduleId = createdSchedule.id;
  const updateScheduleInput = await toValidatedDto(UpdateAdminScheduleDto, {
    title: "운영 테스트 일정 수정",
    categoryLabel: "운영",
    dateKey: "2026-06-10",
    timeLabel: "11:00 - 12:00",
    locationLabel: "온라인",
    visibilityType: "class",
    visibilityScope: classScope,
    visibilityLabel: "테스트 코스 운영 수업",
    requiresAttendanceCheck: true,
    attendanceWindowStartAt: "2026-06-10T11:00:00+09:00",
    attendanceWindowEndAt: "2026-06-10T11:15:00+09:00",
  });
  const updatedSchedule = adminSchedulesController.updateSchedule(scheduleId, updateScheduleInput);
  assert.equal(updatedSchedule.id, scheduleId);
  assert.equal(updatedSchedule.title, "운영 테스트 일정 수정");

  adminSchedulesController.deleteSchedule(scheduleId);
  adminCoursesController.deleteCourse(courseId);

  await expectHttpError(
    () => Promise.resolve(adminAttendanceScopesController.getAttendanceScopeWorkspace(courseId)),
    404,
    "COURSE_NOT_FOUND",
  );
});
