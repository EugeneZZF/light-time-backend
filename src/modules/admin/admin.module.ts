import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AdminJwtStrategy } from './auth/admin-jwt.strategy';
import { AdminJwtAuthGuard } from './auth/admin-jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.ADMIN_JWT_SECRET ?? 'dev-admin-secret-change-me',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtStrategy, AdminJwtAuthGuard],
})
export class AdminModule {}
