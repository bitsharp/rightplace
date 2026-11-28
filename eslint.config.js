// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', 'design/*', 'coverage/*', '.expo/*', 'supabase/functions/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    // Hermes (the app on device) lacks these Intl APIs; Node (jest) has them, so tests would not catch it.
    // `style: 'unit'` in NumberFormat is also unsupported there: use i18n keys with plurals instead.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...['RelativeTimeFormat', 'ListFormat', 'DisplayNames', 'Segmenter', 'PluralRules'].map(
          (name) => ({
            selector: `MemberExpression[object.name='Intl'][property.name='${name}']`,
            message: `Intl.${name} does not exist in Hermes: use i18next keys and plurals.`,
          }),
        ),
        {
          selector: "Property[key.name='style'][value.value='unit']",
          message: "Intl style 'unit' is not supported by Hermes: use i18next keys and plurals.",
        },
      ],
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
