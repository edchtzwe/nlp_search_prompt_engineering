// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jestPlugin from 'eslint-plugin-jest';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // 1. Global Ignores
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '.kanel/'],
  },

  // 2. Base Configs
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. General Node/TS Rules
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node, // Adds process, console, etc.
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }], // Allow logs for backend apps
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // 4. Jest Specific Rules
  {
    files: ['tests/**/*.ts', '**/*.test.ts'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' in tests
    },
  },

  // 5. Prettier Config (Must be last to override conflicts)
  eslintConfigPrettier
);