const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',  // Changed from jsdom to node
  moduleDirectories: ['node_modules', '<rootDir>'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  setupFiles: ['<rootDir>/.jest/setEnvVars.js'],
  reporters: [
    'default',
    '<rootDir>/jest.customReporter.js'
  ]
};

module.exports = createJestConfig(customJestConfig);
