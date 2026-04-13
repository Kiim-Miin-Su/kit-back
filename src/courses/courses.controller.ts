import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CoursesService } from "./courses.service";

@ApiTags("courses")
@Controller("courses")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: "강의 카탈로그 전체 조회 (공개)" })
  @ApiResponse({ status: 200, description: "강의 목록 + 카테고리 + 추천 강의 반환" })
  async getCatalog() {
    return this.coursesService.getCatalog();
  }

  @Get(":slug")
  @ApiOperation({ summary: "강의 상세 조회 (slug 기준, 공개)" })
  @ApiResponse({ status: 200, description: "강의 상세 정보 반환" })
  @ApiResponse({ status: 404, description: "강의 없음" })
  async getBySlug(@Param("slug") slug: string) {
    return this.coursesService.getCourseBySlug(slug);
  }
}
