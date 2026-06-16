declare const securityConfig: {
  tiers: {
    student: RateLimiterTier;
    instructor: RateLimiterTier;
    admin: RateLimiterTier;
    default: RateLimiterTier;
  };
  endpoints: {
    auth: RateLimiterTier;
    transactions: RateLimiterTier;
    ipfs: RateLimiterTier;
  };
  ddos: {
    burst: number;
    limit: number;
    maxExpiry: number;
    checkInterval: number;
  };
  whitelist: string[];
  blacklist: string[];
  logging: {
    enabled: boolean;
    file: string;
    level: string;
    performanceTracking: boolean;
  };
  geoRestrictions: {
    enabled: boolean;
    blockedCountries: string[];
  };
  timeRestrictions: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
  autoBlock: {
    enabled: boolean;
    threshold: number;
    durationDays: number;
  };
};

interface RateLimiterTier {
  windowMs: number;
  max: number;
  message: string;
  burst: number;
}

export default securityConfig;
