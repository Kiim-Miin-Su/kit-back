import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { AccessTokenPayload, RefreshTokenPayload } from "./auth.types";

@Injectable()
export class TokenCodecService {
  private readonly secret =
    process.env.AUTH_TOKEN_SECRET ?? "local-dev-auth-token-secret-change-me";

  signAccessToken(payload: Omit<AccessTokenPayload, "type" | "exp">, ttlSeconds: number) {
    return this.sign({
      ...payload,
      type: "access",
      exp: this.toUnixTime(ttlSeconds),
    });
  }

  signRefreshToken(payload: Omit<RefreshTokenPayload, "type" | "exp">, ttlSeconds: number) {
    return this.sign({
      ...payload,
      type: "refresh",
      exp: this.toUnixTime(ttlSeconds),
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = this.verify(token);

    if (payload.type !== "access") {
      throw new UnauthorizedException({
        code: "INVALID_ACCESS_TOKEN",
        message: "access token 타입이 올바르지 않습니다.",
      });
    }

    return payload as AccessTokenPayload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.verify(token);

    if (payload.type !== "refresh") {
      throw new UnauthorizedException({
        code: "INVALID_REFRESH_TOKEN",
        message: "refresh token 타입이 올바르지 않습니다.",
      });
    }

    return payload as RefreshTokenPayload;
  }

  private sign(payload: AccessTokenPayload | RefreshTokenPayload) {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = this.createSignature(encodedPayload);
    return `local.${encodedPayload}.${signature}`;
  }

  private verify(token: string): AccessTokenPayload | RefreshTokenPayload {
    const [prefix, encodedPayload, receivedSignature] = token.split(".");

    if (!prefix || !encodedPayload || !receivedSignature || prefix !== "local") {
      throw new UnauthorizedException({
        code: "INVALID_TOKEN_FORMAT",
        message: "토큰 형식이 올바르지 않습니다.",
      });
    }

    const expectedSignature = this.createSignature(encodedPayload);

    if (!this.isSameSignature(receivedSignature, expectedSignature)) {
      throw new UnauthorizedException({
        code: "INVALID_TOKEN_SIGNATURE",
        message: "토큰 서명이 올바르지 않습니다.",
      });
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AccessTokenPayload | RefreshTokenPayload;

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException({
        code: "TOKEN_EXPIRED",
        message: "토큰이 만료되었습니다.",
      });
    }

    return payload;
  }

  private createSignature(encodedPayload: string) {
    return createHmac("sha256", this.secret).update(encodedPayload).digest("base64url");
  }

  private isSameSignature(received: string, expected: string) {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  }

  private toUnixTime(ttlSeconds: number) {
    return Math.floor(Date.now() / 1000) + ttlSeconds;
  }
}
