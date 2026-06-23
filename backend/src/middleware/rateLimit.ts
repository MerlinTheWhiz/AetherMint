import { RequestHandler } from 'express';
import {
  rateLimitConfig,
  RateLimitConfiguration,
  RateLimitTierConfig,
} from '../config/redis';

export type RateLimitScope = 'ip' | 'user' | 'endpoint';

export interface RateLimitOptions extends RateLimitTierConfig {
  name?: string;
  scope?: RateLimitScope;
  keyPrefix?: string;
}

export interface TieredRateLimitConfiguration extends RateLimitConfiguration {}

// The implementation remains in the CommonJS module for compatibility with
// existing JavaScript routes. These typed exports provide one configuration
// contract to TypeScript consumers.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const limiter = require('./rateLimiter') as {
  createRateLimiter: (options: Partial<RateLimitOptions>) => RequestHandler;
};

export const rateLimitConfiguration: TieredRateLimitConfiguration = rateLimitConfig;

export const rateLimitMiddleware = (
  options: Partial<RateLimitOptions> = {}
): RequestHandler => limiter.createRateLimiter(options);

export const rateLimits = {
  auth: rateLimitMiddleware({
    ...rateLimitConfig.endpoints.auth,
    name: 'auth',
    scope: 'ip',
  }),
  upload: rateLimitMiddleware({
    ...rateLimitConfig.endpoints.ipfs,
    name: 'ipfs',
    scope: 'user',
  }),
  general: rateLimitMiddleware({
    ...rateLimitConfig.authenticated,
    name: 'authenticated',
    scope: 'user',
  }),
  readOnly: rateLimitMiddleware({
    ...rateLimitConfig.public,
    name: 'public',
    scope: 'ip',
  }),
  static: rateLimitMiddleware({
    ...rateLimitConfig.public,
    max: rateLimitConfig.public.max * 3,
    burstMax: rateLimitConfig.public.burstMax * 3,
    name: 'static',
    scope: 'ip',
  }),
};
