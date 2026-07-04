import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
    let service: AuthService;
    let usersServiceMock: any;
    let jwtServiceMock: any;
    let prismaServiceMock: any;

    beforeEach(async () => {
        usersServiceMock = {
            findByEmail: jest.fn(),
            updateLockoutState: jest.fn(),
            updateLastLogin: jest.fn(),
            create: jest.fn(),
        };

        jwtServiceMock = {
            sign: jest.fn().mockReturnValue('mock_jwt_token'),
        };

        prismaServiceMock = {
            loginActivity: {
                create: jest.fn().mockResolvedValue({ id: 1 }),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: usersServiceMock },
                { provide: JwtService, useValue: jwtServiceMock },
                { provide: PrismaService, useValue: prismaServiceMock },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateDomain', () => {
        it('should allow jkkm.edu.in domain emails', () => {
            // Accessing private method via type-casting or indirect validation via validateUser
            usersServiceMock.findByEmail.mockResolvedValue(null);

            expect(
                service.validateUser('student@jkkm.edu.in', 'Password123')
            ).rejects.toThrow(UnauthorizedException); // Rejected because user doesn't exist, not because of domain
        });

        it('should block non-jkkm.edu.in domain emails', async () => {
            await expect(
                service.validateUser('student@gmail.com', 'Password123')
            ).rejects.toThrow(ForbiddenException);

            await expect(
                service.validateUser('malicious@jkkm.edu.inz', 'Password123')
            ).rejects.toThrow(ForbiddenException);
        });

        it('should trim and handle mixed casing for jkkm.edu.in domain emails', async () => {
            usersServiceMock.findByEmail.mockResolvedValue(null);
            await expect(
                service.validateUser(' STUDENT@JKKM.EDU.IN ', 'Password123')
            ).rejects.toThrow(UnauthorizedException); // Bypassed domain check, fails lookup
        });
    });

    describe('validateUser', () => {
        let mockUser: any;

        beforeEach(async () => {
            const hashedPassword = await bcrypt.hash('Jkkm@Password123', 10);
            mockUser = {
                id: 1,
                name: 'Test Student',
                email: 'student@jkkm.edu.in',
                password: hashedPassword,
                phone: '1234567890',
                isActive: true,
                failedLoginAttempts: 0,
                lockUntil: null,
                role: { id: 1, name: 'STUDENT' },
            };
        });

        it('should validate user with correct credentials successfully', async () => {
            usersServiceMock.findByEmail.mockResolvedValue(mockUser);
            usersServiceMock.updateLockoutState.mockResolvedValue(true);

            const result = await service.validateUser('student@jkkm.edu.in', 'Jkkm@Password123');
            expect(result).toBeDefined();
            expect(result.id).toBe(mockUser.id);
            expect(usersServiceMock.updateLockoutState).toHaveBeenCalledWith(mockUser.id, 0, null);
        });

        it('should throw UnauthorizedException on incorrect password and increment attempts', async () => {
            usersServiceMock.findByEmail.mockResolvedValue(mockUser);
            usersServiceMock.updateLockoutState.mockResolvedValue(true);

            await expect(
                service.validateUser('student@jkkm.edu.in', 'WrongPassword')
            ).rejects.toThrow(UnauthorizedException);

            expect(usersServiceMock.updateLockoutState).toHaveBeenCalledWith(mockUser.id, 1, null);
        });

        it('should lockout account after 5 failed attempts', async () => {
            mockUser.failedLoginAttempts = 4;
            usersServiceMock.findByEmail.mockResolvedValue(mockUser);
            usersServiceMock.updateLockoutState.mockResolvedValue(true);

            await expect(
                service.validateUser('student@jkkm.edu.in', 'WrongPassword')
            ).rejects.toThrow(UnauthorizedException);

            // Lockout state updated with failedLoginAttempts = 5 and lockUntil non-null date
            expect(usersServiceMock.updateLockoutState).toHaveBeenCalledWith(
                mockUser.id,
                5,
                expect.any(Date)
            );
        });

        it('should throw UnauthorizedException if account is currently locked', async () => {
            mockUser.lockUntil = new Date(Date.now() + 10 * 60 * 1000); // locked for 10 more minutes
            usersServiceMock.findByEmail.mockResolvedValue(mockUser);

            await expect(
                service.validateUser('student@jkkm.edu.in', 'Jkkm@Password123')
            ).rejects.toThrow(UnauthorizedException);
        });
    });
});
