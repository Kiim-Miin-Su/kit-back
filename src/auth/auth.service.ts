import {
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { UsersService } from "../users/users.service";
import { StoredUserRecord } from "../users/users.types";
import { AUTH_SESSION_REPOSITORY, AuthSessionRepository } from "./auth-session.repository";
import {
  AuthenticatedRequestUser,
  AuthSessionResponse,
  CookieRequest,
  CookieResponse,
  StoredRefreshSession,
} from "./auth.types";
import { TokenCodecService } from "./token-codec.service";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const REFRESH_COOKIE_NAME = "ai_edu_refresh_token";
// 미들웨어(Edge)가 읽을 수 있도록 non-httpOnly로 설정하는 역할 쿠키
const ROLE_COOKIE_NAME = "ai_edu_role";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenCodecService: TokenCodecService,
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  async signIn(email: string, password: string, response: CookieResponse): Promise<AuthSessionResponse> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException({
        code: "USER_NOT_FOUND",
        message: "입력한 이메일로 가입된 계정을 찾을 수 없습니다.",
      });
    }

    if (!this.usersService.verifyPassword(user, password)) {
      throw new UnauthorizedException({
        code: "INVALID_PASSWORD",
        message: "비밀번호가 올바르지 않습니다.",
      });
    }

    return this.issueSession(user, response);
  }

  async signOut(request: CookieRequest, response: CookieResponse) {
    const refreshToken = this.readRefreshTokenFromRequest(request);

    if (refreshToken) {
      try {
        const payload = this.tokenCodecService.verifyRefreshToken(refreshToken);
        await this.revokeSession(payload.sessionId);
      } catch {
        // ignore invalid refresh token on logout
      }
    }

    this.clearRefreshCookie(response);
    return { success: true };
  }

  getMe(user: AuthenticatedRequestUser): AuthenticatedRequestUser {
    return user;
  }

  async refresh(request: CookieRequest, response: CookieResponse) {
    const refreshToken = this.readRefreshTokenFromRequest(request);

    if (!refreshToken) {
      throw new UnauthorizedException({
        code: "REFRESH_TOKEN_REQUIRED",
        message: "refresh token cookie가 필요합니다.",
      });
    }

    const payload = this.tokenCodecService.verifyRefreshToken(refreshToken);
    const session = await this.getActiveSession(payload.sessionId);
    const user = await this.usersService.findByUserId(session.userId);

    if (!user) {
      throw new UnauthorizedException({
        code: "USER_NOT_FOUND",
        message: `userId=${session.userId} 사용자를 찾을 수 없습니다.`,
      });
    }

    await this.revokeSession(session.sessionId);
    return this.issueSession(user, response);
  }

  async authenticateAccessToken(token: string): Promise<AuthenticatedRequestUser> {
    const payload = this.tokenCodecService.verifyAccessToken(token);
    const user = await this.usersService.findByUserId(payload.sub);

    if (!user) {
      throw new UnauthorizedException({
        code: "USER_NOT_FOUND",
        message: `userId=${payload.sub} 사용자를 찾을 수 없습니다.`,
      });
    }

    return this.toAuthenticatedUser(user);
  }

  private async issueSession(
    user: StoredUserRecord,
    response: CookieResponse,
  ): Promise<AuthSessionResponse> {
    const sessionId = randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();
    const database = await this.sessionRepository.read();

    database.sessions.push({
      sessionId,
      userId: user.userId,
      createdAt,
      expiresAt,
    });
    await this.sessionRepository.write(database);

    const accessToken = this.tokenCodecService.signAccessToken(
      {
        sub: user.userId,
        email: user.email,
        role: user.role,
        name: user.userName,
      },
      ACCESS_TOKEN_TTL_SECONDS,
    );
    const refreshToken = this.tokenCodecService.signRefreshToken(
      {
        sub: user.userId,
        sessionId,
      },
      REFRESH_TOKEN_TTL_SECONDS,
    );

    this.setRefreshCookie(response, refreshToken);
    this.setRoleCookie(response, user.role, REFRESH_TOKEN_TTL_SECONDS);

    return {
      accessToken,
      user: {
        id: user.userId,
        name: user.userName,
        email: user.email,
        role: user.role,
      },
    };
  }

  private readRefreshTokenFromRequest(request: CookieRequest) {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    const cookie = cookieHeader
      .split(";")
      .map((item: string) => item.trim())
      .find((item: string) => item.startsWith(`${REFRESH_COOKIE_NAME}=`));

    if (!cookie) {
      return null;
    }

    return decodeURIComponent(cookie.slice(`${REFRESH_COOKIE_NAME}=`.length));
  }

  private setRefreshCookie(response: CookieResponse, refreshToken: string) {
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
  }

  private clearRefreshCookie(response: CookieResponse) {
    response.cookie(REFRESH_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    response.cookie(ROLE_COOKIE_NAME, "", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  private setRoleCookie(response: CookieResponse, role: string, maxAge: number) {
    response.cookie(ROLE_COOKIE_NAME, role, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: maxAge * 1000,
    });
  }

  private async getActiveSession(sessionId: string): Promise<StoredRefreshSession> {
    const session = (await this.sessionRepository.read()).sessions.find(
      (item) => item.sessionId === sessionId,
    );

    if (!session || session.revokedAt) {
      throw new UnauthorizedException({
        code: "INVALID_REFRESH_SESSION",
        message: "refresh session이 유효하지 않습니다.",
      });
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException({
        code: "REFRESH_TOKEN_EXPIRED",
        message: "refresh session이 만료되었습니다.",
      });
    }

    return session;
  }

  private async revokeSession(sessionId: string) {
    const database = await this.sessionRepository.read();
    const sessionIndex = database.sessions.findIndex((item) => item.sessionId === sessionId);

    if (sessionIndex < 0) {
      return;
    }

    database.sessions[sessionIndex] = {
      ...database.sessions[sessionIndex],
      revokedAt: new Date().toISOString(),
    };
    await this.sessionRepository.write(database);
  }

  private toAuthenticatedUser(user: StoredUserRecord): AuthenticatedRequestUser {
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      name: user.userName,
    };
  }
}
