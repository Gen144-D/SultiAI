/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/**/*.test.*',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
