export const attendanceStatusValues = [
  "NOT_CHECKED_IN",
  "CHECKED_IN",
  "LATE",
  "ABSENT",
] as const;
export type AttendanceStatus = (typeof attendanceStatusValues)[number];

export interface AttendanceScheduleTemplate {
  key: string;
  title: string;
  categoryLabel: string;
  dayOffset: number;
  timeLabel: string;
  locationLabel: string;
  visibilityType: "global" | "class";
  requiresAttendanceCheck: boolean;
  supportsCodeCheckIn?: boolean;
  attendanceWindowStartTime?: string;
  attendanceWindowEndTime?: string;
}

export interface AttendanceRecord {
  userId: string;
  scheduleKey: string;
  attendanceStatus: AttendanceStatus;
  checkedAt?: string;
}

export interface AttendanceDatabase {
  programName: string;
  expectedCodeLength: number;
  scheduleTemplates: AttendanceScheduleTemplate[];
  checkInCodeByScheduleKey: Record<string, string>;
  records: AttendanceRecord[];
}

export interface StudentScheduleResponse {
  id: string;
  title: string;
  categoryLabel: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  visibilityType: "global" | "class";
  visibilityScope: string;
  visibilityLabel: string;
  requiresAttendanceCheck: boolean;
  attendanceWindowLabel?: string;
  attendanceWindowStartAt?: string;
  attendanceWindowEndAt?: string;
  attendanceStatus?: AttendanceStatus;
  checkedAt?: string;
  supportsCodeCheckIn?: boolean;
}

export interface StudentAttendanceWorkspaceResponse {
  programName: string;
  className: string;
  classScope: string;
  allowedScheduleScopes: string[];
  allowedScheduleLabels: string[];
  expectedCodeLength: number;
  schedules: StudentScheduleResponse[];
}

export interface AttendanceCheckInResponse {
  scheduleId: string;
  attendanceStatus: AttendanceStatus;
  checkedAt: string;
  isLate: boolean;
}
