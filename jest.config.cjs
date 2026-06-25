module.exports = {
  transform: {
    '^.+\\.(js|jsx|cjs|ts|tsx)$': 'babel-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Jest must not pick up Vitest suites (electron/, src/) or Bun-only tests (bun:test).
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/',
    '/electron/',
    '/tests/',
    '/backend/utils/emailTemplates\\.test\\.js',
    '/backend/utils/commitAnalysisService\\.test\\.js',
    '/backend/utils/encryption\\.test\\.js',
    '/backend/tests/generateProjectRoutes\\.test\\.js',
    '/backend/tests/note_security_logic\\.test\\.js',
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node', 'cjs'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)', '**/?(*.)+(spec|test).cjs'],
  setupFilesAfterEnv: ['<rootDir>/node_modules/@testing-library/jest-dom/dist/index.js'],
};
