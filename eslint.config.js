const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'],
  },
]);
