import { defineConfig } from '@playwright/test';

// Pruebas de punta a punta sobre el frontend ya compilado.
// Servidor propio: `npx next start -p 3120` con VALKEY_URL=redis://127.0.0.1:6379/7 y ENTORNO=blanco.
// Usa el Chromium ya instalado en la máquina; no descarga navegadores.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE ?? 'http://127.0.0.1:3120',
    headless: true,
    acceptDownloads: true,
    launchOptions: {
      executablePath:
        process.env.E2E_CHROMIUM ??
        '/home/ian/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',
    },
  },
});
