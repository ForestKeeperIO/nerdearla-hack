import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Las pruebas de web/ declaran `// @vitest-environment jsdom` en su primera línea.
export default defineConfig({
  plugins: [react()],
  test: { include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'web/src/**/*.test.{ts,tsx}'], fileParallelism: false },
});
