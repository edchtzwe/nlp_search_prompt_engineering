import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Custom sequencer to control execution order (Deletions always last)
  testSequencer: '<rootDir>/tests/sequencer.js',
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // 1. Compile each file separately (faster and ignores some strict type checks)
        isolatedModules: true,
        // 2. Override specific tsconfig settings just for Jest
        tsconfig: {
          module: 'commonjs',           // Force CommonJS output so Jest can read it
          moduleResolution: 'node',     // Use standard Node resolution
          verbatimModuleSyntax: false,  // Disable strict syntax that breaks transforms
          rootDir: '.',                 // Allow Jest to see files outside ./src
        },
      },
    ],
  },
};

export default config;