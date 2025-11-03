module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!jest.config.js',
    '!test.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/setup.js'],
  moduleFileExtensions: ['js', 'json'],
  verbose: true
};

