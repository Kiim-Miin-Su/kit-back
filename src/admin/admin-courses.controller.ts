import { Body, Controller, Delete, HttpCode, Param, Post, Put } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { CreateAdminCourseDto } from "./dto/create-admin-course.dto";
import { UpdateCourseMemberRoleDto } from "./dto/update-course-member-role.dto";

@Controller("admin/courses")
export class AdminCoursesController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  createCourse(@Body() body: CreateAdminCourseDto) {
    return this.adminService.createCourse(body);
  }

  @Delete(":courseId")
  @HttpCode(204)
  deleteCourse(@Param("courseId") courseId: string) {
    this.adminService.deleteCourse(courseId);
  }

  @Put(":courseId/members/:userId/role")
  upsertCourseMemberRole(
    @Param("courseId") courseId: string,
    @Param("userId") userId: string,
    @Body() body: UpdateCourseMemberRoleDto,
  ) {
    return this.adminService.upsertCourseMemberRole(courseId, userId, body.role);
  }

  @Delete(":courseId/members/:userId")
  @HttpCode(204)
  deleteCourseMember(
    @Param("courseId") courseId: string,
    @Param("userId") userId: string,
  ) {
    this.adminService.deleteCourseMember(courseId, userId);
  }
}
