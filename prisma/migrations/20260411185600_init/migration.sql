-- CreateEnum
CREATE TYPE "AppUserRole" AS ENUM ('ADMIN', 'INSTRUCTOR', 'ASSISTANT', 'STUDENT');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "CoursePacingType" AS ENUM ('INSTRUCTOR_PACED', 'SELF_PACED');

-- CreateEnum
CREATE TYPE "PublicEnrollmentStatus" AS ENUM ('NOT_ENROLLED', 'PENDING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "CourseMemberRole" AS ENUM ('INSTRUCTOR', 'ASSISTANT', 'STUDENT');

-- CreateEnum
CREATE TYPE "ScheduleVisibilityType" AS ENUM ('GLOBAL', 'CLASS');

-- CreateEnum
CREATE TYPE "ScheduleSourceType" AS ENUM ('SYSTEM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('NOT_CHECKED_IN', 'CHECKED_IN', 'LATE', 'ABSENT');

-- CreateEnum
CREATE TYPE "SubmissionEditorType" AS ENUM ('IDE', 'NOTE');

-- CreateEnum
CREATE TYPE "SubmissionReviewStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "SubmissionMessageFormat" AS ENUM ('TEXT', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "SubmissionFeedbackEntryType" AS ENUM ('GENERAL', 'CODE_SUGGESTION');

-- CreateEnum
CREATE TYPE "SubmissionCodeLanguage" AS ENUM ('TYPESCRIPT', 'JAVASCRIPT', 'PYTHON', 'JAVA', 'SQL', 'MARKDOWN', 'PLAINTEXT');

-- CreateEnum
CREATE TYPE "SubmissionTimelineEventType" AS ENUM ('SUBMITTED', 'RESUBMITTED', 'REVIEW_STATUS_CHANGED', 'COMMENTED', 'VIDEO_UPLOADED');

-- CreateEnum
CREATE TYPE "AuditActorRole" AS ENUM ('ADMIN', 'INSTRUCTOR', 'ASSISTANT', 'STUDENT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('SUBMITTED', 'RESUBMITTED', 'REVIEW_STATUS_CHANGED', 'FEEDBACK_ADDED', 'ASSIGNMENT_UPDATED', 'TEMPLATE_UPDATED');

-- CreateEnum
CREATE TYPE "FileUploadStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_salt" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birth_date" TEXT,
    "title" TEXT NOT NULL,
    "role" "AppUserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_refresh_sessions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "auth_refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "level" "CourseLevel" NOT NULL,
    "duration_label" TEXT NOT NULL,
    "lesson_count" INTEGER NOT NULL,
    "price_label" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "review_count" INTEGER NOT NULL,
    "enrollment_count" INTEGER NOT NULL,
    "thumbnail_tone" TEXT NOT NULL,
    "instructor_user_id" TEXT NOT NULL,
    "class_scope" TEXT NOT NULL,
    "status" "CourseStatus" NOT NULL,
    "section_label" TEXT NOT NULL,
    "room_label" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "enrollment_start_date" TEXT NOT NULL,
    "enrollment_end_date" TEXT NOT NULL,
    "pacing_type" "CoursePacingType" NOT NULL,
    "default_enrollment_status" "PublicEnrollmentStatus" NOT NULL DEFAULT 'NOT_ENROLLED',
    "enrollment_status_label" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "learning_points" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_curriculum_previews" (
    "id" TEXT NOT NULL,
    "preview_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration_label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_preview" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "headers" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_curriculum_previews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_members" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "CourseMemberRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "course_id" TEXT,
    "title" TEXT NOT NULL,
    "category_label" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "date_label" TEXT NOT NULL,
    "time_label" TEXT NOT NULL,
    "location_label" TEXT NOT NULL,
    "visibility_type" "ScheduleVisibilityType" NOT NULL,
    "visibility_scope" TEXT NOT NULL,
    "visibility_label" TEXT NOT NULL,
    "requires_attendance_check" BOOLEAN NOT NULL DEFAULT false,
    "attendance_window_label" TEXT,
    "attendance_window_start_at" TIMESTAMP(3),
    "attendance_window_end_at" TIMESTAMP(3),
    "source_type" "ScheduleSourceType" NOT NULL,
    "supports_code_check_in" BOOLEAN NOT NULL DEFAULT false,
    "check_in_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_scope_policies" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_scope_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "attendance_status" "AttendanceStatus" NOT NULL,
    "checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "allow_file_upload" BOOLEAN NOT NULL DEFAULT true,
    "allow_code_editor" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_templates" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "editor_type" "SubmissionEditorType" NOT NULL,
    "code_language" "SubmissionCodeLanguage" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_user_id" TEXT NOT NULL,

    CONSTRAINT "assignment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_revisions" (
    "id" TEXT NOT NULL,
    "submission_revision_id" TEXT NOT NULL,
    "submission_group_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "student_user_id" TEXT NOT NULL,
    "student_name_snapshot" TEXT NOT NULL,
    "assignment_title_snapshot" TEXT NOT NULL,
    "course_title_snapshot" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "code_language" "SubmissionCodeLanguage" NOT NULL,
    "editor_type" "SubmissionEditorType" NOT NULL,
    "review_status" "SubmissionReviewStatus" NOT NULL,
    "revision" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_feedback_entries" (
    "id" TEXT NOT NULL,
    "feedback_entry_id" TEXT NOT NULL,
    "submission_revision_id" TEXT NOT NULL,
    "reviewer_user_id" TEXT NOT NULL,
    "reviewer_name_snapshot" TEXT NOT NULL,
    "message_format" "SubmissionMessageFormat" NOT NULL,
    "entry_type" "SubmissionFeedbackEntryType" NOT NULL,
    "message" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "code_language" "SubmissionCodeLanguage" NOT NULL,
    "review_status" "SubmissionReviewStatus",
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_feedback_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_timeline_events" (
    "id" TEXT NOT NULL,
    "timeline_event_id" TEXT NOT NULL,
    "submission_revision_id" TEXT,
    "event_type" "SubmissionTimelineEventType" NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_name_snapshot" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assignment_audit_events" (
    "id" TEXT NOT NULL,
    "audit_event_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "submission_revision_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "actor_name_snapshot" TEXT NOT NULL,
    "actor_role" "AuditActorRole" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_assignment_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "bucket_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "FileUploadStatus" NOT NULL,
    "upload_url" TEXT NOT NULL,
    "download_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_attachments" (
    "id" TEXT NOT NULL,
    "submission_revision_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "snapshot_file_name" TEXT NOT NULL,
    "snapshot_mime_type" TEXT NOT NULL,
    "snapshot_size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_attachments" (
    "id" TEXT NOT NULL,
    "feedback_entry_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "snapshot_file_name" TEXT NOT NULL,
    "snapshot_mime_type" TEXT NOT NULL,
    "snapshot_size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_refresh_sessions_session_id_key" ON "auth_refresh_sessions"("session_id");

-- CreateIndex
CREATE INDEX "auth_refresh_sessions_user_id_idx" ON "auth_refresh_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_course_id_key" ON "courses"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "courses_class_scope_key" ON "courses"("class_scope");

-- CreateIndex
CREATE INDEX "courses_category_idx" ON "courses"("category");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "courses_instructor_user_id_idx" ON "courses"("instructor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_curriculum_previews_preview_id_key" ON "course_curriculum_previews"("preview_id");

-- CreateIndex
CREATE INDEX "course_curriculum_previews_course_id_sort_order_idx" ON "course_curriculum_previews"("course_id", "sort_order");

-- CreateIndex
CREATE INDEX "course_members_user_id_idx" ON "course_members"("user_id");

-- CreateIndex
CREATE INDEX "course_members_course_id_role_idx" ON "course_members"("course_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "course_members_course_id_user_id_key" ON "course_members"("course_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_enrollment_id_key" ON "enrollments"("enrollment_id");

-- CreateIndex
CREATE INDEX "enrollments_user_id_status_idx" ON "enrollments"("user_id", "status");

-- CreateIndex
CREATE INDEX "enrollments_course_id_status_idx" ON "enrollments"("course_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_course_id_user_id_key" ON "enrollments"("course_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_schedule_id_key" ON "schedules"("schedule_id");

-- CreateIndex
CREATE INDEX "schedules_course_id_idx" ON "schedules"("course_id");

-- CreateIndex
CREATE INDEX "schedules_date_key_idx" ON "schedules"("date_key");

-- CreateIndex
CREATE INDEX "schedules_visibility_scope_idx" ON "schedules"("visibility_scope");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_scope_policies_course_id_scope_key" ON "attendance_scope_policies"("course_id", "scope");

-- CreateIndex
CREATE INDEX "attendance_records_schedule_id_idx" ON "attendance_records"("schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_user_id_schedule_id_key" ON "attendance_records"("user_id", "schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_assignment_id_key" ON "assignments"("assignment_id");

-- CreateIndex
CREATE INDEX "assignments_course_id_due_at_idx" ON "assignments"("course_id", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_templates_template_id_key" ON "assignment_templates"("template_id");

-- CreateIndex
CREATE INDEX "assignment_templates_course_id_idx" ON "assignment_templates"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_templates_assignment_id_editor_type_code_languag_key" ON "assignment_templates"("assignment_id", "editor_type", "code_language");

-- CreateIndex
CREATE UNIQUE INDEX "submission_revisions_submission_revision_id_key" ON "submission_revisions"("submission_revision_id");

-- CreateIndex
CREATE INDEX "submission_revisions_student_user_id_submitted_at_idx" ON "submission_revisions"("student_user_id", "submitted_at");

-- CreateIndex
CREATE INDEX "submission_revisions_assignment_id_submitted_at_idx" ON "submission_revisions"("assignment_id", "submitted_at");

-- CreateIndex
CREATE INDEX "submission_revisions_course_id_submitted_at_idx" ON "submission_revisions"("course_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "submission_revisions_assignment_id_student_user_id_revision_key" ON "submission_revisions"("assignment_id", "student_user_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "submission_feedback_entries_feedback_entry_id_key" ON "submission_feedback_entries"("feedback_entry_id");

-- CreateIndex
CREATE INDEX "submission_feedback_entries_submission_revision_id_created__idx" ON "submission_feedback_entries"("submission_revision_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "submission_timeline_events_timeline_event_id_key" ON "submission_timeline_events"("timeline_event_id");

-- CreateIndex
CREATE INDEX "submission_timeline_events_submission_revision_id_created_a_idx" ON "submission_timeline_events"("submission_revision_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "course_assignment_audit_events_audit_event_id_key" ON "course_assignment_audit_events"("audit_event_id");

-- CreateIndex
CREATE INDEX "course_assignment_audit_events_course_id_occurred_at_idx" ON "course_assignment_audit_events"("course_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "files_file_id_key" ON "files"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "files_bucket_key_key" ON "files"("bucket_key");

-- CreateIndex
CREATE INDEX "files_owner_user_id_idx" ON "files"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_attachments_submission_revision_id_file_id_key" ON "submission_attachments"("submission_revision_id", "file_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_attachments_feedback_entry_id_file_id_key" ON "feedback_attachments"("feedback_entry_id", "file_id");

-- AddForeignKey
ALTER TABLE "auth_refresh_sessions" ADD CONSTRAINT "auth_refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_user_id_fkey" FOREIGN KEY ("instructor_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_curriculum_previews" ADD CONSTRAINT "course_curriculum_previews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_members" ADD CONSTRAINT "course_members_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_members" ADD CONSTRAINT "course_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_scope_policies" ADD CONSTRAINT "attendance_scope_policies_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("schedule_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_templates" ADD CONSTRAINT "assignment_templates_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("assignment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_templates" ADD CONSTRAINT "assignment_templates_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_revisions" ADD CONSTRAINT "submission_revisions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("assignment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_revisions" ADD CONSTRAINT "submission_revisions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_revisions" ADD CONSTRAINT "submission_revisions_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_feedback_entries" ADD CONSTRAINT "submission_feedback_entries_submission_revision_id_fkey" FOREIGN KEY ("submission_revision_id") REFERENCES "submission_revisions"("submission_revision_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_feedback_entries" ADD CONSTRAINT "submission_feedback_entries_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_timeline_events" ADD CONSTRAINT "submission_timeline_events_submission_revision_id_fkey" FOREIGN KEY ("submission_revision_id") REFERENCES "submission_revisions"("submission_revision_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_timeline_events" ADD CONSTRAINT "submission_timeline_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignment_audit_events" ADD CONSTRAINT "course_assignment_audit_events_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignment_audit_events" ADD CONSTRAINT "course_assignment_audit_events_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("assignment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignment_audit_events" ADD CONSTRAINT "course_assignment_audit_events_submission_revision_id_fkey" FOREIGN KEY ("submission_revision_id") REFERENCES "submission_revisions"("submission_revision_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignment_audit_events" ADD CONSTRAINT "course_assignment_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_attachments" ADD CONSTRAINT "submission_attachments_submission_revision_id_fkey" FOREIGN KEY ("submission_revision_id") REFERENCES "submission_revisions"("submission_revision_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_attachments" ADD CONSTRAINT "submission_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_attachments" ADD CONSTRAINT "feedback_attachments_feedback_entry_id_fkey" FOREIGN KEY ("feedback_entry_id") REFERENCES "submission_feedback_entries"("feedback_entry_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_attachments" ADD CONSTRAINT "feedback_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;
