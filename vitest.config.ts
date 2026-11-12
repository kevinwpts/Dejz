// Tester (Vitest). Logik-tester körs i Node, skärm-tester i en låtsad webbläsare (jsdom) –
// de har raden `// @vitest-environment jsdom` överst.
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Samma React Compiler som appen (vite.config.ts), så att testerna kör den kod som publiceras
  plugins: [react({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } })],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    // Stänger av nätet (fetch) i alla tester och städar efter skärmtester
    setupFiles: ['src/test/setup.ts'],
    // `npm run test:coverage` – hur stor del av koden testerna kör (rapport i mappen coverage/)
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/test/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
});
