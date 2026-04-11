export const courseLifecycleStatusValues = ["ACTIVE", "PENDING"] as const;
export type CourseLifecycleStatus = (typeof courseLifecycleStatusValues)[number];

export const publicEnrollmentStatusValues = [
  "NOT_ENROLLED",
  "PENDING",
  "ACTIVE",
  "COMPLETED",
] as const;
export type PublicEnrollmentStatus = (typeof publicEnrollmentStatusValues)[number];

export interface CourseInstructor {
  name: string;
  title: string;
}

export interface CourseLessonPreview {
  id: string;
  title: string;
  durationLabel: string;
  isPreview?: boolean;
  summary?: string;
  headers?: string[];
}

export interface PublicCourseDetail {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  tags: string[];
  level: "입문" | "중급" | "심화";
  durationLabel: string;
  lessonCount: number;
  priceLabel: string;
  rating: number;
  reviewCount: number;
  enrollmentCount: number;
  thumbnailTone: string;
  instructor: CourseInstructor;
  enrollmentStatus: PublicEnrollmentStatus;
  enrollmentStatusLabel?: string;
  isFeatured?: boolean;
  learningPoints: string[];
  curriculumPreview: CourseLessonPreview[];
}

export interface StoredCourseRecord extends PublicCourseDetail {
  classScope: string;
  lifecycleStatus: CourseLifecycleStatus;
  sectionLabel: string;
  roomLabel: string;
  capacity: number;
  startDate: string;
  endDate: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
}

export interface CoursesDatabase {
  categories: string[];
  featuredCourseId: string;
  courses: StoredCourseRecord[];
}

export interface CourseCatalogResponse {
  featuredCourse: PublicCourseDetail;
  courses: PublicCourseDetail[];
  categories: string[];
}
