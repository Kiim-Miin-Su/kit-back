import { Body, Controller, Delete, HttpCode, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "./admin.service";
import { CreateAdminCourseDto } from "./dto/create-admin-course.dto";
import { UpdateCourseMemberRoleDto } from "./dto/update-course-member-role.dto";

@ApiTags("admin / courses")
@ApiBearerAuth()
@Controller("admin/courses")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminCoursesController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({ summary: "수업 생성" })
  @ApiResponse({ status: 201, description: "생성된 수업 정보 반환" })
  @ApiResponse({ status: 400, description: "날짜 범위 오류 또는 유효성 검사 실패" })
  createCourse(@Body() body: CreateAdminCourseDto) {
    return this.adminService.createCourse(body);
  }

  @Delete(":courseId")
  @HttpCode(204)
  @ApiOperation({ summary: "수업 삭제 (관련 일정·멤버·감사로그 cascade 삭제)" })
  @ApiResponse({ status: 204, description: "삭제 성공" })
  @ApiResponse({ status: 404, description: "수업 없음 (COURSE_NOT_FOUND)" })
  async deleteCourse(@Param("courseId") courseId: string) {
    await this.adminService.deleteCourse(courseId);
  }

  @Put(":courseId/members/:userId/role")
  @ApiOperation({ summary: "수강생/강사/조교 역할 배정 또는 변경" })
  @ApiResponse({ status: 200, description: "변경된 멤버 바인딩 반환" })
  @ApiResponse({ status: 404, description: "수업 또는 사용자 없음" })
  @ApiResponse({ status: 409, description: "정원 초과 (COURSE_CAPACITY_EXCEEDED)" })
  upsertCourseMemberRole(
    @Param("courseId") courseId: string,
    @Param("userId") userId: string,
    @Body() body: UpdateCourseMemberRoleDto,
  ) {
    return this.adminService.upsertCourseMemberRole(courseId, userId, body.role);
  }

  @Delete(":courseId/members/:userId")
  @HttpCode(204)
  @ApiOperation({ summary: "수업 멤버 제거" })
  @ApiResponse({ status: 204, description: "제거 성공" })
  @ApiResponse({ status: 404, description: "수업 없음 (COURSE_NOT_FOUND)" })
  async deleteCourseMember(
    @Param("courseId") courseId: string,
    @Param("userId") userId: string,
  ) {
    await this.adminService.deleteCourseMember(courseId, userId);
  }
}
