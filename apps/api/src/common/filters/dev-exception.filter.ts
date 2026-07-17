import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class DevExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (!(exception instanceof HttpException)) {
      console.error('Erro interno na API:', exception);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(typeof body === 'string' ? { message: body, statusCode: status } : body);
      return;
    }

    const message =
      exception instanceof Error ? exception.message : 'Erro interno do servidor';

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
    });
  }
}
