# Componentes de terceros y licencias

Proyecto MIT. Regla aplicada: solo se copia código de componentes con licencia
MIT, BSD, ISC o Apache-2.0 y se conserva su aviso. Cuando la página de 21st.dev
no declara licencia (`no-license` o `unknown`), o el código no es visible sin
API key, el componente se reimplementó con código propio sobre shadcn/ui (MIT).

| Componente | Autor | URL | Licencia declarada | Estado |
|---|---|---|---|---|
| File Upload | bundui | https://21st.dev/@bundui/components/file-upload3 | **no-license** | Reimplementado (`components/subir.tsx`, sobre react-dropzone). Nada de su código se copió. |
| Stepper | kevingirelli | https://21st.dev/@kevingirelli/components/stepper | MIT | Reimplementado (`components/ui/stepper.tsx`): la página declara MIT pero el código fuente no es visible sin API key de 21st.dev. |
| Stat Card | konsstepnov | https://21st.dev/@konsstepnov/components/stat-card | (página da 404) | Sustituido (`components/ui/stat-card.tsx`): implementación propia sobre la Card oficial de shadcn/ui. |
| Star Rating | shadcncraft | https://21st.dev/@shadcncraft/components/star-rating | Apache-2.0 | Reimplementado (`components/ui/star-rating.tsx`): fuente no visible sin API key. Solo lectura con relleno parcial. |
| Comparison | muneebable | https://21st.dev/@muneebable/components/comparison | **unknown** | Reimplementado (`components/ui/comparison.tsx`): dos tarjetas + divisor «VS», sin framer-motion. |
| Data Table | shadcn (oficial) | https://21st.dev/@shadcn/components/data-table | MIT | Adaptado del patrón oficial sobre TanStack Table (`components/ui/data-table.tsx`): ordenación y paginación. |
| Bar List | sltowl | https://21st.dev/@sltowl/components/bar-list | (página da 404) | Sustituido (`components/ui/bar-list.tsx`): implementación propia del patrón lista-con-barra. |
| Sidebar | shadcn (oficial) | https://21st.dev/@shadcn/components/sidebar | MIT | **Copiado tal cual** del registro oficial (`github.com/shadcn-ui/ui`, `apps/v4/registry/new-york-v4/ui/sidebar.tsx`), solo adaptando rutas de import → `components/ui/sidebar.tsx` con `sheet.tsx`, `tooltip.tsx` y `hooks/use-mobile.ts` del mismo origen. |
| Empty | cnippet | https://21st.dev/@cnippet-dev/components/cnippet-empty | MIT | Sustituido por el componente oficial shadcn/ui `empty` (MIT, misma API: Empty/EmptyHeader/EmptyMedia/EmptyTitle/EmptyDescription/EmptyContent) → `components/ui/empty.tsx`. La fuente de cnippet no es visible sin API key. |
| Sonner / Toaster | Emil Kowalski + shadcn | https://sonner.emilkowal.ski | MIT | Dependencia npm `sonner` + wrapper oficial shadcn (`components/ui/sonner.tsx`, copiado del registro, tema fijado a claro). |
| Alert Banner | lavikatiyar | https://21st.dev/@lavikatiyar/components/alert-banner | **unknown** | Reimplementado (`components/ui/alert.tsx`): banner con variantes e iconos, sin framer-motion. |

## Bibliotecas de apoyo (vía npm)

| Paquete | Uso | Licencia |
|---|---|---|
| react-dropzone | Zona de arrastre de archivos | MIT |
| @tanstack/react-table 8.x | Data table | MIT |
| radix-ui | Primitivas del sidebar (Slot, Dialog, Tooltip) | MIT |
| sonner | Avisos tipo toast | MIT |
| next-themes | Tema del wrapper sonner | MIT |
| @base-ui/react | Primitivas de los componentes shadcn base-nova | MIT |
| lucide-react | Iconos | ISC |
| class-variance-authority | Variantes | Apache-2.0 |
| recharts | (dependencia conservada; la vista previa usa BarList) | MIT |
| tw-animate-css | Animaciones base | MIT |
| iovalkey | Cliente Valkey | MIT |

## Tipografías

Inter e IBM Plex Mono, servidas por `next/font/google` desde Google Fonts
(Open Font License). No se copiaron tipografías de pago ni imágenes de details.so.
