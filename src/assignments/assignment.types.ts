export const submissionEditorTypeValues = ["IDE", "NOTE"] as const;
export type SubmissionEditorType = (typeof submissionEditorTypeValues)[number];

export const submissionReviewStatusValues = ["SUBMITTED", "REVIEWED", "NEEDS_REVISION"] as const;
export type SubmissionReviewStatus = (typeof submissionReviewStatusValues)[number];

export const submissionMessageFormatValues = ["TEXT", "MARKDOWN"] as const;
export type SubmissionMessageFormat = (typeof submissionMessageFormatValues)[number];

export const submissionFeedbackEntryTypeValues = ["GENERAL", "CODE_SUGGESTION"] as const;
export type SubmissionFeedbackEntryType = (typeof submissionFeedbackEntryTypeValues)[number];

export const submissionCodeLanguageValues = [
  "typescript",
  "javascript",
  "python",
  "java",
  "sql",
  "markdown",
  "plaintext",
] as const;
export type SubmissionCodeLanguage = (typeof submissionCodeLanguageValues)[number];

export const submissionTimelineEventTypeValues = [
  "SUBMITTED",
  "RESUBMITTED",
  "REVIEW_STATUS_CHANGED",
  "COMMENTED",
  "VIDEO_UPLOADED",
] as const;
export type SubmissionTimelineEventType = (typeof submissionTimelineEventTypeValues)[number];

export type AssignmentActorRole = "ADMIN" | "INSTRUCTOR" | "ASSISTANT" | "STUDENT";

export interface SubmissionCourseRef {
  courseId: string;
  courseTitle: string;
}

export interface AssignmentDefinition {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  prompt: string;
  dueAt: string;
  createdAt: string;
  allowFileUpload: boolean;
  allowCodeEditor: boolean;
}

export interface AssignmentTemplate {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  editorType: SubmissionEditorType;
  codeLanguage: SubmissionCodeLanguage;
  title: string;
  content: string;
  updatedAt: string;
  updatedById: string;
  updatedByName: string;
}

export interface SubmissionAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface SubmissionFeedbackEntry {
  id: string;
  reviewerId: string;
  reviewerName: string;
  messageFormat: SubmissionMessageFormat;
  entryType: SubmissionFeedbackEntryType;
  message: string;
  code: string;
  codeLanguage: SubmissionCodeLanguage;
  attachments: SubmissionAttachment[];
  createdAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  message: string;
  code: string;
  codeLanguage: SubmissionCodeLanguage;
  editorType: SubmissionEditorType;
  attachments: SubmissionAttachment[];
  submittedAt: string;
  updatedAt: string;
  reviewStatus: SubmissionReviewStatus;
  revision: number;
  feedbackHistory: SubmissionFeedbackEntry[];
}

export interface SubmissionTimelineEvent {
  id: string;
  submissionId?: string;
  type: SubmissionTimelineEventType;
  actorId: string;
  actorName: string;
  createdAt: string;
  note?: string;
}

export interface InstructorUploadedVideo {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedById: string;
  uploadedByName: string;
}

export interface SubmissionDashboardMetric {
  expectedSubmissionCount: number;
  submittedCount: number;
  submissionRate: number;
  reviewedCount: number;
  needsRevisionCount: number;
  pendingReviewCount: number;
}

export interface SubmissionDashboardByStudent {
  studentId: string;
  studentName: string;
  expectedSubmissionCount: number;
  submittedCount: number;
  submissionRate: number;
  latestSubmittedAt?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  enrolledCourseIds: string[];
}

export interface StudentSubmissionWorkspaceData {
  studentId: string;
  studentName: string;
  enrolledCourses: SubmissionCourseRef[];
  assignments: AssignmentDefinition[];
  templates: AssignmentTemplate[];
  submissions: AssignmentSubmission[];
}

export interface InstructorSubmissionWorkspaceData {
  assignments: AssignmentDefinition[];
  templates: AssignmentTemplate[];
  submissions: AssignmentSubmission[];
  timeline: SubmissionTimelineEvent[];
  videos: InstructorUploadedVideo[];
  dashboard: SubmissionDashboardMetric;
  dashboardByStudent: SubmissionDashboardByStudent[];
}

export interface SubmissionDetailData {
  submission: AssignmentSubmission;
  assignment?: AssignmentDefinition;
  revisionHistory: AssignmentSubmission[];
  timeline: SubmissionTimelineEvent[];
}

export interface AssignmentTimelineData {
  timeline: SubmissionTimelineEvent[];
  submissionLabelById: Record<string, string>;
}

export interface CreateInstructorAssignmentResult {
  assignment: AssignmentDefinition;
  template?: AssignmentTemplate;
}

export interface AssignmentDatabase {
  students: StudentProfile[];
  assignments: AssignmentDefinition[];
  templates: AssignmentTemplate[];
  submissions: AssignmentSubmission[];
  timeline: SubmissionTimelineEvent[];
  videos: InstructorUploadedVideo[];
}
