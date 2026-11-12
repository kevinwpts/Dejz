// Tester (Vitest). Logik-tester körs i Node, skärm-tester i en låtsad webbläsare (jsdom) –
// de har raden `// @vitest-environment jsdom` överst.
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
