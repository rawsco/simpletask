module.exports = {
  preset: 'ts-jest',
  testEnvironment: './jest-environment.js',
  roots: ['<rootDir>/lambda'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'lambda/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
