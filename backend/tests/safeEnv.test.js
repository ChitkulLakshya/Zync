describe('getSafeEnvInt', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('returns fallback when env is missing', () => {
    delete process.env.TEST_SAFE_ENV;
    const { getSafeEnvInt } = require('../utils/safeEnv');

    expect(getSafeEnvInt('TEST_SAFE_ENV', 1, 10, 4)).toBe(4);
  });

  test('clamps values below minimum', () => {
    process.env.TEST_SAFE_ENV = '-20';
    const { getSafeEnvInt } = require('../utils/safeEnv');

    expect(getSafeEnvInt('TEST_SAFE_ENV', 1, 10, 4)).toBe(1);
  });

  test('clamps values above maximum', () => {
    process.env.TEST_SAFE_ENV = '9999';
    const { getSafeEnvInt } = require('../utils/safeEnv');

    expect(getSafeEnvInt('TEST_SAFE_ENV', 1, 10, 4)).toBe(10);
  });

  test('uses fallback when env is not an integer', () => {
    process.env.TEST_SAFE_ENV = 'abc';
    const { getSafeEnvInt } = require('../utils/safeEnv');

    expect(getSafeEnvInt('TEST_SAFE_ENV', 1, 10, 4)).toBe(4);
  });
});

describe('free-tier limit config integration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('applies safe clamping for architecture and delivery limits', () => {
    process.env.ARCHITECTURE_CACHE_MAX_ENTRIES = '999999';
    process.env.ARCHITECTURE_CACHE_TTL_MS = '20';
    process.env.DELIVERY_CATCHUP_BATCH_SIZE = '-1';
    process.env.DELIVERY_CATCHUP_MAX_BATCHES = '500';

    const limits = require('../config/freeTierLimits');

    expect(limits.ARCHITECTURE_CACHE_MAX_ENTRIES).toBe(5000);
    expect(limits.ARCHITECTURE_CACHE_TTL_MS).toBe(1000);
    expect(limits.DELIVERY_CATCHUP_BATCH_SIZE).toBe(1);
    expect(limits.DELIVERY_CATCHUP_MAX_BATCHES).toBe(20);
  });
});
