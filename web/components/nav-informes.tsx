'use client';

// Navegación de informes en el riel lateral: un elemento por informe con su
// estado actual en una línea pequeña. Patrón: SidebarMenu del registry oficial.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileSpreadsheet, LayoutGrid } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export type ItemInforme = {
  alcance: string;
  titulo: string;
  estadoTexto: string;
  bloqueado: boolean;
  href: string;
};

export function NavInformes({ items }: { items: ItemInforme[] }) {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {items.map((it) => {
        const activo = pathname.startsWith(`/informe/${it.alcance}`);
        const Icono = it.alcance === 'global' ? LayoutGrid : FileSpreadsheet;
        return (
          <SidebarMenuItem key={it.alcance}>
            <SidebarMenuButton
              render={<Link href={it.href} aria-current={activo ? 'page' : undefined} />}
              isActive={activo}
              className="h-auto items-start py-2.5"
              tooltip={it.titulo}
            >
              <Icono className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium leading-snug">{it.titulo}</span>
                <span
                  className="text-xs leading-snug"
                  style={{ color: it.bloqueado ? 'var(--aviso-texto)' : 'var(--tinta-tenue)' }}
                >
                  {it.estadoTexto}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
