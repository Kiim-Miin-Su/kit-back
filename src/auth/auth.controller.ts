import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
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

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("sign-in")
  async signIn(@Body() body: SignInDto, @Res({ passthrough: true }) response: CookieResponse) {
    return this.authService.signIn(body.email, body.password, response);
  }

  @Post("sign-out")
  @UseGuards(AuthGuard)
  async signOut(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return this.authService.signOut(request, response);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  getMe(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.authService.getMe(user);
  }

  @Post("refresh")
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return this.authService.refresh(request, response);
  }
}
