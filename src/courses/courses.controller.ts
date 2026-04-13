import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CoursesService } from "./courses.service";

@ApiTags("courses")
@Controller("courses")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: "공개 강좌 목록" })
  async getCatalog() {
    return this.coursesService.getCatalog();
  }

  @Get(":slug")
  @ApiOperation({ summary: "강좌 상세 (slug)" })
  async getBySlug(@Param("slug") slug: string) {
    return this.coursesService.getCourseBySlug(slug);
  }
}
