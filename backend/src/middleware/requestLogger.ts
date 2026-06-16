import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import logger, { runWithRequestContext } from '../utils/logger';

type RequestWithLogging = Request & {
  requestId?: string;
};

const getRequestPath = (req: Request) => req.originalUrl || req.url || req.path;

export const requestLogger = (req: RequestWithLogging, res: Response, next: NextFunction): void => {
  const requestId = (req.header('x-request-id') || randomUUID()).toString();
  const startedAt = Date.now();
  const requestPath = getRequestPath(req);

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  runWithRequestContext(
    {
      requestId,
      method: req.method,
      path: requestPath,
      ip: req.ip,
    },
    () => {
      res.on('finish', () => {
        const durationMs = Date.now() - startedAt;
        const statusCode = res.statusCode;
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

        logger.log(level, 'HTTP request completed', {
          requestId,
          method: req.method,
          path: requestPath,
          statusCode,
          durationMs,
          ip: req.ip,
        });
      });

      next();
    }
  );
};

export default requestLogger;