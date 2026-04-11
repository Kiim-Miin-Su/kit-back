import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedRequestUser } from "./auth.types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedRequestUser => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedRequestUser }>();
    return request.user as AuthenticatedRequestUser;
  },
);
