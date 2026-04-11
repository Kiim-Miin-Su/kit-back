import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, unknown>; user?: unknown }>();
    const authorization = request.headers?.authorization;

    if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
      throw new UnauthorizedException({
        code: "AUTH_REQUIRED",
        message: "Bearer access token이 필요합니다.",
      });
    }

    request.user = await this.authService.authenticateAccessToken(
      authorization.slice("Bearer ".length),
    );
    return true;
  }
}
