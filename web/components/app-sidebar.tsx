// Riel lateral de la aplicación: marca, informes con su estado y el entorno.
// Componente Sidebar del registry oficial (@shadcn en 21st.dev es este mismo).
// Servidor: lee el estado de cada informe y se lo pasa a la navegación cliente.
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NavInformes, type ItemInforme } from '@/components/nav-informes';
import { alcancesDemo, estadoRecorrido, tituloInforme } from '@/lib/informe';
import {
  indicePaso, pasoActual, pasosDe, puedeEntrar, rutaDestino, TITULO_PASO,
  type EstadoRecorrido,
} from '@/lib/recorrido';

function resumenEstado(e: EstadoRecorrido): { texto: string; bloqueado: boolean } {
  if (e.alcance === 'global' && !puedeEntrar(e, 'calidad')) return { texto: 'Bloqueada', bloqueado: true };
  const actual = pasoActual(e);
  if (actual === 'exportar' && puedeEntrar(e, 'exportar')) return { texto: 'Lista para exportar', bloqueado: false };
  if (e.fuentes === 0) return { texto: 'Sin empezar', bloqueado: false };
  const n = indicePaso(e.alcance, actual) + 1;
  return { texto: `Paso ${n}/${pasosDe(e.alcance).length} · ${TITULO_PASO[actual]}`, bloqueado: false };
}

export async function AppSidebar() {
  const estados = await Promise.all(alcancesDemo().map((a) => estadoRecorrido(a)));
  const items: ItemInforme[] = estados.map((e) => {
    const r = resumenEstado(e);
    return {
      alcance: e.alcance,
      titulo: tituloInforme(e.alcance),
      estadoTexto: r.texto,
      bloqueado: r.bloqueado,
      href: rutaDestino(e),
    };
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          className="flex flex-col gap-0.5 rounded-md px-2 py-2 no-underline group-data-[collapsible=icon]:px-0"
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              letterSpacing: '-0.01em',
              fontSynthesis: 'none',
              color: 'var(--tinta)',
              fontWeight: 400,
            }}
            className="truncate group-data-[collapsible=icon]:hidden"
          >
            EIRA · Impacto
          </span>
          <span
            className="mono group-data-[collapsible=icon]:hidden"
            style={{ fontSize: 'var(--fs-meta)', color: 'var(--tinta-tenue)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Consolidación
          </span>
          <span className="hidden items-center justify-center group-data-[collapsible=icon]:flex" aria-hidden="true">
            <span
              style={{
                fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--vino)', fontWeight: 400,
              }}
            >
              EI
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Informes de impacto</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavInformes items={items} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <p className="mono" style={{ fontSize: 'var(--fs-meta)', color: 'var(--tinta-tenue)' }}>
            Datos ficticios de demostración
          </p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
