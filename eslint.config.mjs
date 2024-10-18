import globals from 'globals';
import pluginJs from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    files: ['**/*.js', '**/*.jsx', '**/*.mjs'],
  },
  {
    ignores: ['**/*.min.js', 'tools/importer/'],
  },
  {
    languageOptions: { globals: globals.browser },
  },
  pluginJs.configs.recommended,
  prettierRecommended,
  {
    rules: {
      indent: ['error', 2],
      'comma-dangle': ['error', 'always-multiline'],
      'comma-spacing': ['error', { before: false, after: true }],
      'comma-style': ['error', 'last'],
      'no-extra-semi': 'error',
      'no-tabs': 'error',
      'func-names': ['error', 'as-needed'],
      semi: ['error', 'always'],
      'no-nested-ternary': 'error',
      'no-new': 'error',
      'no-unused-vars': 'warn',
      'no-duplicate-imports': ['error', { includeExports: true }],
      'one-var': ['error', 'never'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'no-multiple-empty-lines': 'error',
      quotes: ['error', 'single'],
      'no-constant-binary-expression': 'error',
    },
  },
];
