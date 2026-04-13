import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "./admin.service";
import { SearchAdminUsersQueryDto } from "./dto/search-admin-users.query.dto";

@ApiTags("admin / users")
@ApiBearerAuth("access-token")
@Controller("admin/users")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get("workspace")
  @ApiOperation({ summary: "관리자 워크스페이스 조회 (전체 수강생·수업·멤버 바인딩)" })
  @ApiResponse({ status: 200, description: "워크스페이스 데이터 반환" })
  getWorkspace() {
    return this.adminService.getUsersWorkspace();
  }

  @Get("search")
  @ApiOperation({ summary: "사용자 검색 (userId prefix / 이름 / 생년월일)", description: "query 파라미터로 userId, 이름, 생년월일 검색 가능" })
  @ApiResponse({ status: 200, description: "검색 결과 목록" })
  async searchUsers(@Query() query: SearchAdminUsersQueryDto) {
    const users = await this.adminService.searchUsers(query.query);
    return { users };
  }
}
