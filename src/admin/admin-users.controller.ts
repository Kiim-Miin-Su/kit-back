import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "./admin.service";
import { SearchAdminUsersQueryDto } from "./dto/search-admin-users.query.dto";

@ApiTags("admin")
@ApiBearerAuth("access-token")
@Controller("admin/users")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get("workspace")
  @ApiOperation({ summary: "사용자 관리 워크스페이스" })
  getWorkspace() {
    return this.adminService.getUsersWorkspace();
  }

  @Get("search")
  @ApiOperation({ summary: "사용자 검색" })
  searchUsers(@Query() query: SearchAdminUsersQueryDto) {
    return {
      users: this.adminService.searchUsers(query.query),
    };
  }
}
