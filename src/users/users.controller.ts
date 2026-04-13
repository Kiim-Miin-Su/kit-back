import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("register")
  @ApiOperation({ summary: "회원가입" })
  async register(@Body() body: CreateUserDto) {
    return this.usersService.register(body);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "내 프로필 조회" })
  async getMe(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.usersService.getMyProfile(user.userId);
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "내 프로필 수정" })
  async updateMe(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.updateMe(user.userId, body);
  }
}
