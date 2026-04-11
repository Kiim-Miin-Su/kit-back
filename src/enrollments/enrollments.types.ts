export const enrollmentStatusValues = ["PENDING", "ACTIVE", "COMPLETED"] as const;
export type EnrollmentStatus = (typeof enrollmentStatusValues)[number];

export interface StoredEnrollmentRecord {
  enrollmentId: string;
  courseId: string;
  userId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface EnrollmentsDatabase {
  enrollments: StoredEnrollmentRecord[];
}

export interface EnrollmentResponse {
  enrollmentId: string;
  courseId: string;
  userId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
}
