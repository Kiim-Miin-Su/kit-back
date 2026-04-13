import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminService } from "./admin.service";
import { SearchAdminUsersQueryDto } from "./dto/search-admin-users.query.dto";

@Controller("admin/users")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get("workspace")
  getWorkspace() {
    return this.adminService.getUsersWorkspace();
  }

  @Get("search")
  searchUsers(@Query() query: SearchAdminUsersQueryDto) {
    return {
      users: this.adminService.searchUsers(query.query),
    };
  }
}
