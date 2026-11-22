import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { LoginSchema, RegisterSchema, type LoginInput, type RegisterInput } from "@zalocare/contracts";
import type { CookieOptions, Request, Response } from "express";
import { CurrentUser, Public, type AuthUser } from "../../common/decorators";
import { zod } from "../../common/pipes/zod.pipe";
import { env, isProd } from "../../config/env";
import { AuthService } from "./auth.service";

const COOKIE = "zc_rt";
const cookieOpts = (): CookieOptions => ({
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/api/v1/auth",
  domain: env.COOKIE_DOMAIN,
  maxAge: env.REFRESH_TTL_DAYS * 86400_000,
});

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  async register(@Body(zod(RegisterSchema)) body: RegisterInput, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...session } = await this.auth.register(body, req.headers["user-agent"]);
    res.cookie(COOKIE, refreshToken, cookieOpts());
    return session;
  }

  @Public()
  @HttpCode(200)
  @Post("login")
  async login(@Body(zod(LoginSchema)) body: LoginInput, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...session } = await this.auth.login(body, req.headers["user-agent"]);
    res.cookie(COOKIE, refreshToken, cookieOpts());
    return session;
  }

  @Public()
  @HttpCode(200)
  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const { refreshToken, ...session } = await this.auth.refresh(req.cookies?.[COOKIE], req.headers["user-agent"]);
      res.cookie(COOKIE, refreshToken, cookieOpts());
      return session;
    } catch (e) {
      res.clearCookie(COOKIE, { ...cookieOpts(), maxAge: undefined });
      throw e;
    }
  }

  @Public()
  @HttpCode(204)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, { ...cookieOpts(), maxAge: undefined });
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
