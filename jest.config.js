export default {
  testEnvironment: 'jsdom',
  transform: {},
  injectGlobals: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/extension/**/*.test.js'
  ],
  collectCoverageFrom: [
    'extension/**/*.js',
    '!extension/**/*.test.js',
    '!extension/**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
