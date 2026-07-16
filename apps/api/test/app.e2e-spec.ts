import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in, and isolates tenant data', async () => {
    const suffix = Date.now();
    const userA = {
      email: `usera-${suffix}@test.com`,
      password: 'password123',
      name: 'User A',
    };
    const userB = {
      email: `userb-${suffix}@test.com`,
      password: 'password123',
      name: 'User B',
    };

    const registerA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userA)
      .expect(201);
    const tokenA = registerA.body.accessToken;

    const registerB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userB)
      .expect(201);
    const tokenB = registerB.body.accessToken;

    const expenseA = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: 100, date: '2026-07-01', description: 'Expense A' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200)
      .expect((res: request.Response) => {
        expect(res.body.data).toHaveLength(0);
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/expenses/${expenseA.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    await prisma.expense.deleteMany({
      where: { description: 'Expense A' },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [userA.email, userB.email] } },
    });
  });

  it('returns dashboard summary for authenticated user', async () => {
    const suffix = Date.now();
    const user = {
      email: `dash-${suffix}@test.com`,
      password: 'password123',
      name: 'Dash User',
    };

    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(user)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/incomes')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .send({ amount: 500, date: '2026-07-01', description: 'Test income' })
      .expect(201);

    const summary = await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(200);

    expect(summary.body.totalIncome).toBeGreaterThanOrEqual(500);

    await prisma.income.deleteMany({ where: { description: 'Test income' } });
    await prisma.user.delete({ where: { email: user.email } });
  });
});
