import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "./current-user.decorator";
import { SignInDto } from "./dto/sign-in.dto";
import { AuthenticatedRequestUser, CookieRequest, CookieResponse } from "./auth.types";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("sign-in")
  @ApiOperation({ summary: "이메일/비밀번호 로그인", description: "성공 시 httpOnly refreshToken 쿠키와 accessToken을 반환합니다." })
  @ApiResponse({ status: 200, description: "로그인 성공 — accessToken + user 반환" })
  @ApiResponse({ status: 401, description: "이메일 없음(USER_NOT_FOUND) 또는 비밀번호 불일치(INVALID_PASSWORD)" })
  async signIn(@Body() body: SignInDto, @Res({ passthrough: true }) response: CookieResponse) {
    return this.authService.signIn(body.email, body.password, response);
  }

  @Post("sign-out")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "로그아웃", description: "refreshToken 쿠키를 삭제하고 세션을 무효화합니다." })
  @ApiResponse({ status: 200, description: "로그아웃 성공" })
  async signOut(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return this.authService.signOut(request, response);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "현재 인증된 사용자 정보 조회" })
  @ApiResponse({ status: 200, description: "인증된 사용자 정보" })
  @ApiResponse({ status: 401, description: "인증 필요" })
  getMe(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.authService.getMe(user);
  }

  @Post("refresh")
  @ApiOperation({ summary: "accessToken 갱신", description: "httpOnly refreshToken 쿠키를 이용해 새 accessToken을 발급합니다." })
  @ApiResponse({ status: 200, description: "새 accessToken 발급" })
  @ApiResponse({ status: 401, description: "refreshToken 없음 또는 만료" })
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return this.authService.refresh(request, response);
  }
}
