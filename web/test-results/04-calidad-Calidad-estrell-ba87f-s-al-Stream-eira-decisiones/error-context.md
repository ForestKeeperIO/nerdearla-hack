# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-calidad.spec.ts >> Calidad: estrellas por archivo y decisiones al Stream eira:decisiones
- Location: e2e/04-calidad.spec.ts:11:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: getByRole('button', { name: 'Continuar a Vista previa' })
Expected: enabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" getByRole('button', { name: 'Continuar a Vista previa' }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Continuar a Vista previa' })

```

```yaml
- banner:
  - link "EIRA · Impacto":
    - /url: /
  - text: En blanco
- main:
  - link "Todos los informes":
    - /url: /
  - paragraph: Tamizaje Rosa
  - navigation "Pasos del informe": Subir Calidad Vista previa Primero revisa la calidad de los datos. Exportar Primero revisa la calidad de los datos.
  - heading "Calidad de los datos" [level=1]
  - paragraph: La calificación de cada archivo, lo que le falta y los casos que solo una persona puede decidir.
  - region "Por archivo":
    - article:
      - heading "tamizaje-rosa.xlsx" [level=2]
      - paragraph: 132 filas contadas · corte 2026-09-30
      - img "4 / 5"
      - text: 4 / 5
      - paragraph: "Qué le falta: 8 registros sin persona identificada; 3 anomalías de calidad; 6 inasistencias registradas."
      - group:
        - text: ▾ Dato faltante · 1 fila
        - list:
          - listitem: "fila 17 id: ID vacío"
      - group:
        - text: ▾ Fecha posterior al corte · 1 fila
        - list:
          - listitem: "fila 44 fecha: La fecha de servicio es posterior al corte"
      - group:
        - text: ▾ Ciudad no reconocida · 1 fila
        - list:
          - listitem: "fila 88 ciudad: Municipio no reconocido en el catálogo"
      - group: ▸ Cómo se calculó
  - region "Decisiones pendientes":
    - paragraph: No quedan casos por decidir.
  - link "Volver":
    - /url: /informe/tamizaje-rosa/subir
  - button "Continuar con 3 por decidir"
  - paragraph: Cada par sin decidir cuenta como una sola persona.
- contentinfo:
  - paragraph: Datos ficticios de demostración · EIRA Movimiento Rosa A.C.
- alert
```

# Test source

```ts
  1  | // Caso 4: con la semilla — Calidad muestra estrellas (3 = 3 llenas),
  2  | // "¿Es la misma persona?", cada botón escribe la decisión en el Stream
  3  | // eira:decisiones, y "Continuar" solo se habilita cuando toca.
  4  | import { expect, test } from '@playwright/test';
  5  | import { semilla, valkey } from './ayudas';
  6  | 
  7  | test.beforeEach(() => {
  8  |   semilla();
  9  | });
  10 | 
  11 | test('Calidad: estrellas por archivo y decisiones al Stream eira:decisiones', async ({ page }) => {
  12 |   // Melenas tiene estrellas = 3 en la semilla.
  13 |   await page.goto('/informe/melenas-en-movimiento/calidad');
  14 |   const tarjetaMel = page.locator('article', { hasText: 'melenas-en-movimiento.xlsx' });
  15 |   await expect(tarjetaMel.locator('.estrella-llena')).toHaveCount(3);
  16 |   await expect(tarjetaMel.locator('.estrella-vacia')).toHaveCount(2);
  17 | 
  18 |   // Los pares pendientes se ven en Tamizaje Rosa (por la fuente del lado A).
  19 |   await page.goto('/informe/tamizaje-rosa/calidad');
  20 |   const tarjetaTam = page.locator('article', { hasText: 'tamizaje-rosa.xlsx' });
  21 |   await expect(tarjetaTam.locator('.estrella-llena')).toHaveCount(4);
  22 | 
  23 |   await expect(page.getByText('¿Es la misma persona?')).toBeVisible();
  24 |   await expect(page.getByText('Faltan 3 por decidir')).toBeVisible();
  25 |   await expect(page.getByText('Registro A')).toBeVisible();
  26 |   await expect(page.getByText('Registro B')).toBeVisible();
  27 | 
  28 |   // Cada clic en un botón escribe una decisión en el Stream.
  29 |   const v = valkey();
  30 |   try {
  31 |     await page.getByRole('button', { name: 'Es la misma persona' }).click();
  32 |     await expect(page.getByText('Faltan 2 por decidir')).toBeVisible();
  33 |     let msgs = await v.xrange('eira:decisiones', '-', '+');
  34 |     expect(msgs.length).toBe(1);
  35 |     expect(msgs[0][1]).toContain('misma');
  36 | 
  37 |     await page.getByRole('button', { name: 'Son dos personas' }).click();
  38 |     await expect(page.getByText('Faltan 1 por decidir')).toBeVisible();
  39 |     msgs = await v.xrange('eira:decisiones', '-', '+');
  40 |     expect(msgs.length).toBe(2);
  41 |     expect(msgs[1][1]).toContain('distinta');
  42 |     expect(msgs[1][1]).toContain('persona');
  43 | 
  44 |     await page.getByRole('button', { name: 'Es la misma persona' }).click();
  45 |     await expect(page.getByText('No quedan casos por decidir.')).toBeVisible();
  46 |     msgs = await v.xrange('eira:decisiones', '-', '+');
  47 |     expect(msgs.length).toBe(3);
  48 |   } finally {
  49 |     v.disconnect();
  50 |   }
  51 | 
  52 |   // Sin pendientes, el botón pasa a "Continuar a Vista previa" y lleva ahí.
  53 |   const continuar = page.getByRole('button', { name: 'Continuar a Vista previa' });
> 54 |   await expect(continuar).toBeEnabled();
     |                           ^ Error: expect(locator).toBeEnabled() failed
  55 |   await continuar.click();
  56 |   await expect(page).toHaveURL(/\/informe\/tamizaje-rosa\/vista-previa/);
  57 | });
  58 | 
```