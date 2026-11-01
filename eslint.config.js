// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', 'design/*', 'coverage/*', '.expo/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: ['**/*.test.js'],
    languageOptions: {
      globals: { describe: 'readonly', it: 'readonly', expect: 'readonly', jest: 'readonly' },
    },
  },
  {
    files: ['scripts/**/*.js', '*.config.js', 'jest.setup.ts'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
]);
