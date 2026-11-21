# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-vacia.spec.ts >> portada con base vacía: programas sin empezar y Global bloqueado
- Location: e2e/01-vacia.spec.ts:10:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Tamizaje Rosa')
Expected: visible
Error: strict mode violation: getByText('Tamizaje Rosa') resolved to 2 elements:
    1) <span>Tamizaje Rosa</span> aka getByText('01Tamizaje RosaCampañas de')
    2) <span class="etiqueta">Falta subir archivos de Tamizaje Rosa y Melenas e…</span> aka getByText('Falta subir archivos de')

Call log:
  - Expect "toBeVisible" getByText('Tamizaje Rosa') with timeout 5000ms
  - waiting for getByText('Tamizaje Rosa')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "EIRA · Impacto" [ref=e4] [cursor=pointer]:
        - /url: /
      - generic "Entorno de demostración" [ref=e5]: En blanco
  - main [ref=e6]:
    - generic [ref=e7]:
      - heading "Informes de impacto" [level=1] [ref=e8]
      - paragraph [ref=e9]: Sube los reportes de cada coordinación; el informe se arma solo, sin contar dos veces el mismo archivo, la misma fila ni la misma persona.
      - list [ref=e10]:
        - listitem [ref=e11] [cursor=pointer]:
          - generic [ref=e12]: "01"
          - generic [ref=e13]:
            - generic [ref=e14]: Tamizaje Rosa
            - generic [ref=e15]: Campañas de salud con Papanicolaou, ultrasonido de mama, exploración clínica y valoración nutricional.
            - generic [ref=e16]: Sin empezar
          - generic [ref=e17]: Empezar
        - listitem [ref=e19] [cursor=pointer]:
          - generic [ref=e20]: "02"
          - generic [ref=e21]:
            - generic [ref=e22]: Melenas en Movimiento
            - generic [ref=e23]: Recolección de cabello y elaboración de pelucas oncológicas.
            - generic [ref=e24]: Sin empezar
          - generic [ref=e25]: Empezar
        - listitem [ref=e27]:
          - generic [ref=e28]: "03"
          - generic [ref=e29]:
            - generic [ref=e30]: Global · todos los programas
            - generic [ref=e31]: "Junta todos los programas: cada programa suma sus personas al total."
            - generic [ref=e32]: Falta subir archivos de Tamizaje Rosa y Melenas en Movimiento.
          - generic [ref=e33]: Bloqueado
  - contentinfo [ref=e38]:
    - paragraph [ref=e39]: Datos ficticios de demostración · EIRA Movimiento Rosa A.C.
  - alert [ref=e40]
```

# Test source

```ts
  1  | // Caso 1: base vacía — la portada muestra los informes del catálogo
  2  | // "Sin empezar" y el Global bloqueado con su motivo.
  3  | import { expect, test } from '@playwright/test';
  4  | import { limpiar } from './ayudas';
  5  | 
  6  | test.beforeEach(async () => {
  7  |   await limpiar();
  8  | });
  9  | 
  10 | test('portada con base vacía: programas sin empezar y Global bloqueado', async ({ page }) => {
  11 |   await page.goto('/');
  12 | 
  13 |   await expect(page.getByRole('heading', { name: 'Informes de impacto' })).toBeVisible();
  14 | 
  15 |   // Los informes del catálogo (en_demo) más el Global.
  16 |   const items = page.getByRole('listitem');
  17 |   await expect(items).toHaveCount(3);
> 18 |   await expect(page.getByText('Tamizaje Rosa')).toBeVisible();
     |                                                 ^ Error: expect(locator).toBeVisible() failed
  19 |   await expect(page.getByText('Melenas en Movimiento')).toBeVisible();
  20 |   await expect(page.getByText('Global · todos los programas')).toBeVisible();
  21 | 
  22 |   // Los dos programas aparecen "Sin empezar" con acción "Empezar".
  23 |   await expect(page.getByText('Sin empezar', { exact: true })).toHaveCount(2);
  24 |   await expect(page.getByText('Empezar', { exact: true })).toHaveCount(2);
  25 | 
  26 |   // El Global está bloqueado y dice por qué.
  27 |   await expect(page.getByText('Bloqueado')).toBeVisible();
  28 |   await expect(
  29 |     page.getByText(/Falta subir archivos de .*Tamizaje Rosa.*Melenas en Movimiento/),
  30 |   ).toBeVisible();
  31 | });
  32 | 
```