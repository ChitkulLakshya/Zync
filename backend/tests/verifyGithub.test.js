const crypto = require('crypto');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('verifyGithub middleware fail-closed behavior', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  test('loads in production when GITHUB_WEBHOOK_SECRET is missing (fail-closed per request)', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.GITHUB_WEBHOOK_SECRET;

    expect(() => {
      jest.isolateModules(() => {
        require('../middleware/verifyGithub');
      });
    }).not.toThrow();
  });

  test('returns 500 for requests when webhook secret is missing (development)', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.GITHUB_WEBHOOK_SECRET;
    const verifyGithub = require('../middleware/verifyGithub');

    const req = {
      headers: {},
      rawBody: Buffer.from('{"ok":true}'),
    };
    const res = makeRes();
    const next = jest.fn();

    verifyGithub(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 500 for requests when webhook secret is missing (production)', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.GITHUB_WEBHOOK_SECRET;
    const verifyGithub = require('../middleware/verifyGithub');

    const req = {
      headers: {},
      rawBody: Buffer.from('{"ok":true}'),
    };
    const res = makeRes();
    const next = jest.fn();

    verifyGithub(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for invalid signature', () => {
    process.env.NODE_ENV = 'development';
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    const verifyGithub = require('../middleware/verifyGithub');

    const req = {
      headers: {
        'x-hub-signature-256': 'sha256=deadbeef',
      },
      rawBody: Buffer.from('{"event":"push"}'),
    };
    const res = makeRes();
    const next = jest.fn();

    verifyGithub(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next for valid signature', () => {
    process.env.NODE_ENV = 'development';
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    const verifyGithub = require('../middleware/verifyGithub');

    const rawBody = Buffer.from('{"event":"push"}');
    const signature =
      'sha256=' + crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET).update(rawBody).digest('hex');

    const req = {
      headers: {
        'x-hub-signature-256': signature,
      },
      rawBody,
    };
    const res = makeRes();
    const next = jest.fn();

    verifyGithub(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
