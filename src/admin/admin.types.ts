export const adminCourseMemberRoleValues = ["INSTRUCTOR", "ASSISTANT", "STUDENT"] as const;
export type AdminCourseMemberRole = (typeof adminCourseMemberRoleValues)[number];

export const adminCourseStatusValues = ["ACTIVE", "PENDING"] as const;
export type AdminCourseStatus = (typeof adminCourseStatusValues)[number];

export const adminCoursePacingTypeValues = ["INSTRUCTOR_PACED", "SELF_PACED"] as const;
export type AdminCoursePacingType = (typeof adminCoursePacingTypeValues)[number];

export const adminScheduleVisibilityTypeValues = ["global", "class"] as const;
export type AdminScheduleVisibilityType = (typeof adminScheduleVisibilityTypeValues)[number];

export const adminScheduleSourceTypeValues = ["SYSTEM", "CUSTOM"] as const;
export type AdminScheduleSourceType = (typeof adminScheduleSourceTypeValues)[number];

export const adminCourseAuditActionValues = [
  "SUBMITTED",
  "RESUBMITTED",
  "REVIEW_STATUS_CHANGED",
  "FEEDBACK_ADDED",
  "ASSIGNMENT_UPDATED",
  "TEMPLATE_UPDATED",
] as const;
export type AdminCourseAuditAction = (typeof adminCourseAuditActionValues)[number];

export interface AdminCourseWorkspaceUser {
  userId: string;
  userName: string;
  birthDate?: string;
  title: string;
  defaultRole: AdminCourseMemberRole;
}

export interface AdminCourseWorkspaceCourse {
  courseId: string;
  courseTitle: string;
  category: string;
  classScope: string;
  status: AdminCourseStatus;
  sectionLabel: string;
  roomLabel: string;
  capacity: number;
  startDate: string;
  endDate: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
  pacingType: AdminCoursePacingType;
}

export interface AdminCourseMemberBinding {
  courseId: string;
  userId: string;
  role: AdminCourseMemberRole;
}

export interface AdminUsersWorkspaceResponse {
  courses: AdminCourseWorkspaceCourse[];
  users: AdminCourseWorkspaceUser[];
  memberBindings: AdminCourseMemberBinding[];
}

export interface AdminScheduleScopeRef {
  visibilityType: AdminScheduleVisibilityType;
  visibilityScope: string;
  visibilityLabel: string;
}

export interface AdminScheduleEvent {
  id: string;
  title: string;
  categoryLabel: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  visibilityType: AdminScheduleVisibilityType;
  visibilityScope: string;
  visibilityLabel: string;
  requiresAttendanceCheck: boolean;
  attendanceWindowStartAt?: string;
  attendanceWindowEndAt?: string;
  attendanceWindowLabel?: string;
  sourceType: AdminScheduleSourceType;
}

export interface AdminScheduleWorkspaceResponse {
  schedules: AdminScheduleEvent[];
  scopes: AdminScheduleScopeRef[];
}

export interface AdminAttendanceScopeWorkspaceResponse {
  courseId: string;
  courseTitle: string;
  classScope: string;
  availableScopes: AdminScheduleScopeRef[];
  allowedScheduleScopes: string[];
}

export interface AdminCourseAssignmentAuditEvent {
  id: string;
  courseId: string;
  assignmentId: string;
  assignmentTitle: string;
  submissionId?: string;
  actorId: string;
  actorName: string;
  actorRole: "ADMIN" | "INSTRUCTOR" | "ASSISTANT" | "STUDENT";
  action: AdminCourseAuditAction;
  occurredAt: string;
  note?: string;
}
