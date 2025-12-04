import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashed = await hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        department: dto.department,
        jobTitle: dto.jobTitle,
      },
    });

    const tokens = await this.buildTokens(user);
    return {
      user: this.safeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await compare(dto.password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.buildTokens(user);
    return {
      user: this.safeUser(user),
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>('auth.jwtRefreshSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.buildTokens(user);
      return {
        user: this.safeUser(user),
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tasksAssigned: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.safeUser(user);
  }

  private async buildTokens(user: User) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const jwtSecret = this.configService.get<string>('auth.jwtSecret');
    const jwtRefreshSecret = this.configService.get<string>('auth.jwtRefreshSecret');
    const accessTokenTtl = this.configService.get<string>('auth.accessTokenTtl') ?? '15m';
    const refreshTokenTtl = this.configService.get<string>('auth.refreshTokenTtl') ?? '7d';

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: accessTokenTtl,
      } as any),
      this.jwtService.signAsync(payload, {
        secret: jwtRefreshSecret,
        expiresIn: refreshTokenTtl,
      } as any),
    ]);

    return { accessToken, refreshToken };
  }

  private safeUser<T extends Prisma.UserGetPayload<Record<string, never>>>(user: T) {
    const { password, ...rest } = user;
    return rest;
  }
}

