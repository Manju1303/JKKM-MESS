import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) { }

  /** Strict validation: check if email domain is JKKM institutional email */
  private validateDomain(email: string) {
    const cleaned = (email || '').toLowerCase().trim();
    if (!cleaned.endsWith('@jkkm.edu.in')) {
      throw new ForbiddenException('Access restricted to JKKM institutional accounts only.');
    }
  }

  /** Logs all login activity to database */
  private async logLoginActivity(
    userId: number | null,
    email: string,
    status: 'SUCCESS' | 'FAILED',
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.loginActivity.create({
        data: {
          userId,
          email,
          status,
          ipAddress: ipAddress || 'Unknown',
          device: userAgent || 'Unknown',
        },
      });
    } catch (err) {
      console.error('Failed to log login activity:', err);
    }
  }

  /** Validate email + password, check locks, and handle failed attempts counters */
  async validateUser(email: string, pass: string, ipAddress?: string, userAgent?: string) {
    const cleanedEmail = (email || '').toLowerCase().trim();
    this.validateDomain(cleanedEmail);

    const user = await this.usersService.findByEmail(cleanedEmail);
    if (!user) {
      this.logLoginActivity(null, cleanedEmail, 'FAILED', ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logLoginActivity(user.id, cleanedEmail, 'FAILED', ipAddress, userAgent);
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if account is currently locked out
    if (user.lockUntil && user.lockUntil > new Date()) {
      this.logLoginActivity(user.id, cleanedEmail, 'FAILED', ipAddress, userAgent);
      const remainingTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account is locked. Try again in ${remainingTime} minutes.`);
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      const attempts = user.failedLoginAttempts + 1;
      const isLocking = attempts >= 5;
      const lockUntil = isLocking ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 mins lock

      await this.usersService.updateLockoutState(user.id, attempts, lockUntil);
      this.logLoginActivity(user.id, cleanedEmail, 'FAILED', ipAddress, userAgent);

      if (isLocking) {
        throw new UnauthorizedException('Account is locked due to 5 failed attempts. Locked for 15 minutes.');
      } else {
        throw new UnauthorizedException(`Invalid credentials. Attempts remaining: ${5 - attempts}`);
      }
    }

    // Success - Reset failed attempts & locks
    await this.usersService.updateLockoutState(user.id, 0, null);
    return user;
  }

  /** Login: validate -> stamp log -> return JWT */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.validateUser(dto.email, dto.password, ipAddress, userAgent);

    // Non-blocking background loggers to bypass response blocking
    this.usersService.updateLastLogin(user.id).catch(err => console.error('Failed to update last login:', err));
    this.logLoginActivity(user.id, user.email, 'SUCCESS', ipAddress, userAgent);

    const payload = { sub: user.id, email: user.email, role: user.role.name, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        roleId: user.roleId,
      },
    };
  }

  /** Register new user (typically called by Super Admin) */
  async register(dto: RegisterDto) {
    const email = (dto.email || '').toLowerCase().trim();
    this.validateDomain(email);
    const exists = await this.usersService.findByEmail(email);
    if (exists) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({ ...dto, email, password: hashed });
    return { message: 'User registered successfully', userId: user.id };
  }

  /** Get profile of currently authenticated user */
  async getProfile(userId: number) {
    return this.usersService.findById(userId);
  }
}
