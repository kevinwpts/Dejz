// Kodgranskning (ESLint 10, "flat config"). Körs i `npm run lint` och på GitHub vid varje push.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintReact from '@eslint-react/eslint-plugin';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'ios', 'android', 'node_modules', 'playwright-report', 'test-results', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    ...eslintReact.configs['recommended-typescript'],
  },
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks, 'unused-imports': unusedImports },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' },
      ],
      // React Compilers regler (refs, purity, immutability …) som fel – koden måste följa
      // Reacts regler för att kompilatorn (vite.config.ts) ska kunna optimera den.
      ...Object.fromEntries(Object.keys(reactHooks.configs['recommended-latest'].rules).map((rule) => [rule, 'error'])),
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Appen loggar via src/utils/logger.ts (fel går till felövervakningen), aldrig console direkt
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/utils/logger.ts', 'src/**/__tests__/**'],
    rules: { 'no-console': 'error' },
  },
  {
    // "Idag" ska vara svenskt datum. toISOString() ger UTC – mellan 00 och 02 svensk tid blir det gårdagen.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/utils/swedishDate.ts', 'src/**/__tests__/**', 'src/test/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name=/^(slice|split|substring)$/][callee.object.callee.property.name='toISOString']",
          message: 'Använd getSwedishDateStr() / formatIsoDateStockholm() från utils/swedishDate – toISOString() ger UTC-datum.',
        },
      ],
    },
  },
  {
    // Node-skript i CommonJS (.cjs) får använda require
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
