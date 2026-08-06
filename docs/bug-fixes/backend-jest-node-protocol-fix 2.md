# Bug Fix: Backend Jest Test Suite Crashes (`node:zlib` / `node:fs`)

## 🐛 The Bug
During the backend CI validation step in GitHub Actions (`Run ESLint & Type Check & Tests`), the entire Jest test suite started fatally crashing before any tests could execute. 

The console output yielded errors such as:
```text
ENOENT: no such file or directory, open 'node:zlib'
ENOENT: no such file or directory, open 'node:fs'
```

Additionally, once tests did begin running, the `teamRoutes.delete.test.js` failed unexpectedly:
```text
Expected: 200
Received: 500
```

## 🔍 Root Cause Analysis

### 1. `node:` Protocol Resolution Failure
The `ENOENT` errors were caused by an extremely outdated version of `jest` (`^25.0.0`, circa 2020) explicitly defined in the `backend/package.json`. 
Modern backend dependencies (like Express 5.x) leverage standard Node.js module imports using the `node:` protocol prefix (e.g., `require('node:zlib')`). The legacy `jest-runtime` module resolver from v25 did not understand the `node:` protocol and incorrectly attempted to resolve it as a physical file on disk, leading to fatal crashes.

### 2. Security PIN Unmocked in Tests
The `500` error in `teamRoutes.delete.test.js` surfaced because we recently introduced a strict `securityPin` requirement (utilizing `bcryptjs` for hash comparison) to the team deletion route. The test suite was still simulating a legacy payload without the PIN, causing the API to reject the request and the mock database chain (`createLeanChain`) to fail since it lacked the `.select()` modifier required by the new logic.

## 🛠️ The Fix

1. **Jest Version Upgrade**: We bumped the `jest` dependency in `backend/package.json` to the modern `^29.7.0` version. Jest v29+ includes a native, fully-featured module resolver that easily handles `node:` protocol imports.
2. **Delete Route Mocking**: 
   - Mocked `bcryptjs` to return `true` for `bcrypt.compare`.
   - Updated `createLeanChain` to elegantly handle the `.select('+securityPin')` chain method.
   - Updated the simulated user payload to include `securityPin: "hashed_pin"`.
   - Modified the supertest request to include `.send({ pin: "123456" })`.

## ✅ Verification
Running `npm test` inside the backend directory now resolves flawlessly:
```text
Test Suites: 12 passed, 12 total
Tests:       44 passed, 44 total
```
All GitHub Actions CI steps pass cleanly.
