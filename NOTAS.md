# NOTAS — rama fe (frontend y tableros)

## Habilidades instaladas (paso 1)

- `npx modern-web-guidance@latest install` funcionó a la primera. Instalada en
  `.agents/skills/modern-web-guidance/` (con symlink para Claude Code).
- `npx skills add nutlope/hallmark` funcionó a la primera. Instalada en
  `.agents/skills/hallmark/` (`skills-lock.json` en la raíz quedó actualizado).

## Dirección visual (Hallmark, modo app screen + fast mode)

- Alcance: pantalla de aplicación ("app screens"), género modern-minimal.
- Tema repartido y elegido: **Coral** (2/3, seed herramienta-interna-para-ong-6f3a·c50cad20·2026-11-21·r0):
  papel gris cálido, superficies de algodón, un solo acento para acción/selección/estado.
- El acento del tema se corrió de coral a **rosa** (oklch hue 8): requisito explícito de EIRA
  ("rosa como acento, no como fondo").
- `theme.mjs scaffold coral --scope app` escribió `web/app/tokens.css` y `web/app/base.css`;
  se quitaron de `base.css` las reglas `[data-slot]` (chocaban con la convención de shadcn/ui).
- Stamp Hallmark en la primera línea de `web/app/globals.css`.

### Las 5 reglas que más cambiaron el diseño

1. Todo color y fuente pasa por tokens en `:root` — nada de literales fuera del bloque
   (`tokens.css` + mapeo a variables shadcn en `globals.css`).
2. Densidad de app: controles de 44 px, tablas antes que tarjetas, estado en la URL
   (los filtros del tablero viven en `?programa=…&ciudad=…`).
3. Cada región con datos tiene cuatro estados (cargando, vacío con qué hacer, error, lleno):
   los estados vacíos de trabajos, fuentes, calidad y tablero dicen qué hacer ahora.
4. Estado con texto además de color: las marcas `.estado` llevan rótulo escrito
   ("Listo: versión nueva", "Duplicado: idéntico"), nunca solo un punto de color.
5. Firma obligada de la herramienta: la lista viva de trabajos (refresco 2 s) y el
   desplegable "Cómo se calculó" con el comando de Valkey y los ms en cada cifra.

Modern Web Guidance: se usó para confirmar patrones (dialog/details nativo para el
desplegable, `:focus-visible`, `prefers-reduced-motion`, impresión). Ver sección
"Modern Web Guidance" al final de esta nota.

## Decisiones y supuestos

- Subida por ruta `POST /api/subir` (multipart) en vez de acción de servidor:
  las server actions tienen límite de 1 MB de cuerpo y los archivos llegan a 10 MB.
  Mismo efecto en Valkey: `SET eira:archivo:<id> EX 3600`, `HSET eira:trabajo:<id>`
  pendiente, `XADD eira:trabajos`.
- `decision` para `restituir_fila` se escribe como `restituir` (el contrato solo
  nombra `misma|distinta`, que aplican a `persona`). Avisado por si Python espera otro valor.
- Fecha de corte del tablero: la más reciente de las fuentes; hoy si no hay ninguna.
- En `eira:decisiones` el campo `por` se llena con el rol ("Presidencia"/"Coordinación").

## Bloqueos / pendientes

- El benchmark de 21st.dev/details.so (`…/devin2/out/c.md`) todavía no existe a esta hora
  (solo `c.tmp`; el proceso que lo genera está atorado en permisos). Se revisó de nuevo
  al terminar el paso 3: sigue sin existir.

## Rehecho de la capa visual (segunda sesión, misma fecha)

- El dueño no aprobó el tema Coral de Hallmark. Nueva dirección: recrear los
  componentes del benchmark (`docs/contexto/benchmark-ui.md`, traído con
  `git merge origin/main`) con aspecto sobrio: fondo stone-50, tarjetas blancas
  con borde 1 px, radio 10 px, sombra casi nula, rosa `#be185d` solo como acento,
  Inter + IBM Plex Mono, cifras tabulares.
- La lógica no cambió: `web/lib/` (claves, valkey, datos, acciones, rol, folio),
  rutas API y el flujo Subir → Calidad → Vista previa → Exportar se conservan.
- Componentes: sidebar oficial shadcn **copiado tal cual** del registro (MIT) con
  sheet/tooltip/use-mobile (radix-ui); stepper, stat-card, star-rating,
  comparison, bar-list, alert-banner y file-upload **reimplementados** (el código
  de 21st.dev no es visible sin API key y varios declaran `no-license`/`unknown`
  o dan 404). Empty y sonner: fuente oficial shadcn (MIT). Tabla completa con
  licencias en `web/TERCEROS.md`.
- Dependencias nuevas: radix-ui, sonner, next-themes, react-dropzone,
  @tanstack/react-table (fijada en 8.x: la v9 trae otra API y rompe el patrón
  shadcn data-table).
- Se eliminaron `components/barras.tsx` (Recharts sustituida por BarList) y
  `components/cabecera.tsx` (sustituida por sidebar + stepper).
- Auditoría Hallmark (sloplint, scope app): 3 FAIL propios corregidos (guión en
  copia, literal de color fuera de tokens, "VS" con tracking). Quedan 4 FAIL 10a
  dentro de `components/ui/sidebar.tsx`: son clases del código upstream copiado
  tal cual (transiciones deliberadas del sidebar); se reportan, no se tocan.
  Gate 20 (stamp Hallmark) reportado: esta iteración no salió de un scaffold
  Hallmark, poner el sello sería atribución falsa.
- Ojo: `next start` sirve el build de cuando arrancó; tras `npm run build` hay
  que reiniciarlo o las capturas salen sin CSS.
