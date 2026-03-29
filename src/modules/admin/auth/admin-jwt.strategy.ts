import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { prisma } from '../../../../prisma/prisma';

export type AdminJwtPayload = {
  sub: number;
  email: string;
  roles: string[];
};

export type AdminJwtUser = {
  id: number;
  email: string;
  fullName: string | null;
  roles: string[];
};

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.ADMIN_JWT_SECRET ?? 'dev-admin-secret-change-me',
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AdminJwtUser> {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: { role: { select: { code: true } } },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token user');
    }

    const roles = user.roles.map((item) => item.role.code);
    if (!roles.includes('admin')) {
      throw new UnauthorizedException('Admin role is required');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
    };
  }
}
