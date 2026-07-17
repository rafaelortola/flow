import './load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { DevExceptionFilter } from './common/filters/dev-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new DevExceptionFilter());
  app.use(cookieParser());
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
        : /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log('');
  console.log('========================================');
  console.log(`  API OK: http://localhost:${port}/api/v1`);
  console.log(`  Health: http://localhost:${port}/api/v1/health`);
  console.log('========================================');
  console.log('');
}

bootstrap().catch((err) => {
  console.error('');
  console.error('ERRO ao iniciar a API:');
  if (err.code === 'EADDRINUSE') {
    console.error(`  Porta ${process.env.PORT ?? 3001} ja esta em uso.`);
    console.error('  Feche o outro processo ou mude PORT no .env');
  } else {
    console.error(`  ${err.message}`);
  }
  console.error('');
  console.error('Confira DATABASE_URL no .env (usuario postgres + senha correta)');
  process.exit(1);
});
