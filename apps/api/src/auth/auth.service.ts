import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new UnauthorizedException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(dto.password, user.passwordHash);
    } catch {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(user.id, user.email);
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    return { message: 'Logout realizado' };
  }

  private async issueTokens(userId: string, email: string) {
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d').trim() || '7d';

    const accessToken = await this.jwtService.signAsync({ sub: userId, email });

    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + this.parseDuration(refreshExpiresIn));

    try {
      await this.prisma.refreshToken.create({
        data: { token: refreshToken, userId, expiresAt },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar sessão';
      console.error('refreshToken.create falhou:', message);
      throw new InternalServerErrorException(
        'Banco desatualizado. Rode: pnpm db:fix',
      );
    }

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email },
    };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] ?? multipliers.d);
  }
}
