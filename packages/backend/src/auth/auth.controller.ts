import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto } from "@polypay/shared";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login with ZK proof
   * POST /api/auth/login
   */
  @Post("login")
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  @Post("refresh")
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }
}