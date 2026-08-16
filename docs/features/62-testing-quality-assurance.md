# 62 — Testing & Quality Assurance

**NEW document** — Test structure, backend route tests, frontend component tests, test utilities, CI considerations

---

## Feature Summary

Zync includes backend route tests using Jest and Supertest, covering authentication, project CRUD, task management, and API error handling. This document covers the test structure, utilities, and quality assurance practices.

---

## Test Structure

```
backend/
├── tests/
│   ├── taskRoutes.test.js       → Task route tests
│   ├── projectRoutes.test.js    → Project route tests
│   ├── auth.test.js             → Auth middleware tests
│   ├── setup.js                 → Test setup (DB mock, fixtures)
│   └── helpers/
│       ├── mockUser.js          → Mock Firebase user
│       ├── mockToken.js         → Mock JWT token
│       └── fixtures.js          → Test data fixtures
├── jest.config.js               → Jest configuration
└── package.json                 → Test scripts
```

---

## Jest Configuration

### File: `backend/jest.config.js`
```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Test Scripts (package.json)
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

---

## Test Setup

### File: `backend/tests/setup.js`
```js
// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'test-uid-123',
      email: 'test@zync.dev',
    }),
  }),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
}));

// Mock Redis
jest.mock('../utils/redisClient', () => ({
  getRedisClient: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(false),
}));

// Mock Mongoose connection
beforeAll(async () => {
  // Use in-memory MongoDB or mock
});
```

---

## Test Utilities

### mockUser.js
```js
module.exports = {
  uid: 'test-uid-123',
  email: 'test@zync.dev',
  displayName: 'Test User',
  photoURL: 'https://example.com/avatar.jpg',
};
```

### mockToken.js
```js
module.exports = {
  validToken: 'Bearer mock-firebase-token',
  invalidToken: 'Bearer invalid-token',
  missingToken: null,
};
```

### fixtures.js
```js
module.exports = {
  project: {
    _id: '60f1a2b3c4d5e6f7a8b9c0d1',
    name: 'Test Project',
    description: 'A test project',
    ownerUid: 'test-uid-123',
    team: [],
  },
  task: {
    _id: '60f1a2b3c4d5e6f7a8b9c0d2',
    title: 'Test Task',
    description: 'A test task',
    stepId: '60f1a2b3c4d5e6f7a8b9c0d3',
    projectId: '60f1a2b3c4d5e6f7a8b9c0d1',
  },
};
```

---

## Test Examples

### Task Routes Test
**File:** `backend/tests/taskRoutes.test.js`

```js
const request = require('supertest');
const app = require('../index');
const { validToken } = require('./helpers/mockToken');

describe('Task Routes', () => {
  describe('PUT /api/tasks/:taskId', () => {
    it('should update task with valid token', async () => {
      const res = await request(app)
        .put('/api/tasks/test-task-id')
        .set('Authorization', validToken)
        .send({ title: 'Updated Title' });
      
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .put('/api/tasks/test-task-id')
        .send({ title: 'Updated Title' });
      
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/tasks/:taskId', () => {
    it('should delete task with valid ownership', async () => {
      const res = await request(app)
        .delete('/api/tasks/test-task-id')
        .set('Authorization', validToken);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Task deleted');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .delete('/api/tasks/nonexistent-id')
        .set('Authorization', validToken);
      
      expect(res.status).toBe(404);
    });
  });
});
```

### Auth Middleware Test
```js
describe('Auth Middleware', () => {
  it('should pass with valid token', async () => {
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = { status: jest.fn().json: jest.fn() };
    const next = jest.fn();
    
    await verifyToken(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.user.uid).toBe('test-uid-123');
  });

  it('should return 401 without token', async () => {
    const req = { headers: {} };
    const res = { status: jest.fn().json: jest.fn() };
    const next = jest.fn();
    
    await verifyToken(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

---

## Test Coverage Areas

| Area | Coverage | Test Files |
|---|---|---|
| Auth middleware | Token verification, 401 cases | auth.test.js |
| Task routes | CRUD, search, quick tasks | taskRoutes.test.js |
| Project routes | CRUD, GitHub linking | projectRoutes.test.js |
| Error handling | 400, 401, 403, 404, 500 | All test files |
| Input validation | Missing fields, invalid data | Route tests |

---

## CI Considerations

### GitHub Actions (Future)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd backend && npm install
      - run: cd backend && npm run test:ci
```

### Pre-Commit Hooks (Future)
```json
{
  "hooks": {
    "pre-commit": "cd backend && npm test"
  }
}
```

---

## Running Tests

```bash
# Run all tests
cd backend && npm test

# Run with watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npx jest tests/taskRoutes.test.js

# Run with verbose output
npx jest --verbose
```

---

## Cross-References

- [51-middleware-stack-overview.md](./51-middleware-stack-overview.md) — Auth middleware being tested
- [47-task-routes-standalone.md](./47-task-routes-standalone.md) — Task routes being tested
- [14-project-crud.md](./14-project-crud.md) — Project routes being tested
- [57-error-handling-strategy.md](./57-error-handling-strategy.md) — Error cases tested
