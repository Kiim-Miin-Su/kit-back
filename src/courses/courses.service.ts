import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { COURSES_REPOSITORY, CoursesRepository } from "./courses.repository";
import {
  CourseCatalogResponse,
  PublicCourseDetail,
  PublicEnrollmentStatus,
  StoredCourseRecord,
} from "./courses.types";

@Injectable()
export class CoursesService {
  constructor(
    @Inject(COURSES_REPOSITORY)
    private readonly repository: CoursesRepository,
  ) {}

  getCatalog(): CourseCatalogResponse {
    const database = this.repository.read();
    const featured = database.courses.find((course) => course.id === database.featuredCourseId);

    if (!featured) {
      throw new NotFoundException({
        code: "FEATURED_COURSE_NOT_FOUND",
        message: `featuredCourseId=${database.featuredCourseId} 수업을 찾을 수 없습니다.`,
      });
    }

    return {
      featuredCourse: this.toPublicCourseDetail(featured),
      courses: database.courses
        .filter((course) => course.id !== featured.id)
        .map((course) => this.toPublicCourseDetail(course)),
      categories: [...database.categories],
    };
  }

  getCourseBySlug(slug: string): PublicCourseDetail {
    return this.toPublicCourseDetail(this.getStoredCourseBySlug(slug));
  }

  getCourseById(courseId: string, enrollmentStatus?: PublicEnrollmentStatus) {
    return this.toPublicCourseDetail(this.getStoredCourseById(courseId), enrollmentStatus);
  }

  getStoredCourseById(courseId: string): StoredCourseRecord {
    const found = this.repository.read().courses.find((course) => course.id === courseId);

    if (!found) {
      throw new NotFoundException({
        code: "COURSE_NOT_FOUND",
        message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
      });
    }

    return found;
  }

  getStoredCourseBySlug(slug: string): StoredCourseRecord {
    const found = this.repository.read().courses.find((course) => course.slug === slug);

    if (!found) {
      throw new NotFoundException({
        code: "COURSE_NOT_FOUND",
        message: `slug=${slug} 수업을 찾을 수 없습니다.`,
      });
    }

    return found;
  }

  private toPublicCourseDetail(
    course: StoredCourseRecord,
    enrollmentStatus?: PublicEnrollmentStatus,
  ): PublicCourseDetail {
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      category: course.category,
      tags: [...course.tags],
      level: course.level,
      durationLabel: course.durationLabel,
      lessonCount: course.lessonCount,
      priceLabel: course.priceLabel,
      rating: course.rating,
      reviewCount: course.reviewCount,
      enrollmentCount: course.enrollmentCount,
      thumbnailTone: course.thumbnailTone,
      instructor: { ...course.instructor },
      enrollmentStatus: enrollmentStatus ?? course.enrollmentStatus,
      enrollmentStatusLabel: course.enrollmentStatusLabel,
      isFeatured: course.isFeatured,
      learningPoints: [...course.learningPoints],
      curriculumPreview: course.curriculumPreview.map((lesson) => ({ ...lesson })),
    };
  }
}
