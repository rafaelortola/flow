import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access-token'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma as never, jwtService as never);
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  it('registers a new user and returns tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1', email: 'a@test.com' });
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.register({
      email: 'a@test.com',
      password: 'secret123',
      name: 'Test User',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBeDefined();
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('rejects login with invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'a@test.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
