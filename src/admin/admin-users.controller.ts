import { Controller, Get, Query } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { SearchAdminUsersQueryDto } from "./dto/search-admin-users.query.dto";

@Controller("admin/users")
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
