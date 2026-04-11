import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
  @ApiOperation({ summary: "신규 회원가입", description: "이메일·비밀번호·이름으로 계정을 생성합니다." })
  @ApiResponse({ status: 201, description: "생성된 사용자 정보 반환" })
  @ApiResponse({ status: 409, description: "이메일 중복 (EMAIL_ALREADY_EXISTS)" })
  async register(@Body() body: CreateUserDto) {
    return this.usersService.register(body);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "나의 프로필 조회" })
  @ApiResponse({ status: 200, description: "사용자 프로필 반환" })
  async getMe(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.usersService.getMyProfile(user.userId);
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "나의 프로필 수정 (이름·생년월일·제목)" })
  @ApiResponse({ status: 200, description: "수정된 프로필 반환" })
  async updateMe(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.updateMe(user.userId, body);
  }
}
