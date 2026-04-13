import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "./current-user.decorator";
import { SignInDto } from "./dto/sign-in.dto";
import { AuthenticatedRequestUser } from "./auth.types";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";

interface CookieRequest {
  headers: {
    cookie?: string;
  };
}

interface CookieResponse {
  cookie: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
    },
  ) => void;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("sign-in")
  @ApiOperation({ summary: "로그인 (access token + refresh cookie 발급)" })
  async signIn(@Body() body: SignInDto, @Res({ passthrough: true }) response: CookieResponse) {
    return this.authService.signIn(body.email, body.password, response);
  }

  @Post("sign-out")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "로그아웃 (refresh cookie 삭제)" })
  async signOut(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return this.authService.signOut(request, response);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "현재 로그인한 사용자 정보" })
  getMe(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.authService.getMe(user);
  }

  @Post("refresh")
  @ApiOperation({ summary: "access token 갱신 (httpOnly refresh cookie 사용)" })
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return this.authService.refresh(request, response);
  }
}
