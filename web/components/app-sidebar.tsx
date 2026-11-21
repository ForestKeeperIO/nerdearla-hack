'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CreditCard,
  FileDown,
  LayoutDashboard,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const PASOS = [
  { href: '/', rotulo: 'Subir', icono: Upload },
  { href: '/calidad', rotulo: 'Calidad', icono: ShieldCheck },
  { href: '/tablero', rotulo: 'Vista previa', icono: LayoutDashboard },
  { href: '/informe', rotulo: 'Exportar', icono: FileDown },
];

export function AppSidebar() {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === '/' ? ruta === '/' : ruta.startsWith(href);

  return (
    <Sidebar collapsible="icon" className="no-imprimir">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  E
                </span>
                <span className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold tracking-tight">Impacto EIRA</span>
                  <span className="text-xs text-muted-foreground">Movimiento Rosa A.C.</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Flujo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PASOS.map((p, i) => (
                <SidebarMenuItem key={p.href}>
                  <SidebarMenuButton asChild isActive={activo(p.href)} tooltip={`${i + 1}. ${p.rotulo}`}>
                    <Link href={p.href} aria-current={activo(p.href) ? 'page' : undefined}>
                      <p.icono />
                      <span>
                        <span className="mr-1.5 text-muted-foreground tabular-nums">{i + 1}.</span>
                        {p.rotulo}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Operación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activo('/registro')} tooltip="Registro con tarjeta">
                  <Link href="/registro" aria-current={activo('/registro') ? 'page' : undefined}>
                    <CreditCard />
                    <span>Registro con tarjeta</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          Datos ficticios de demostración. Todo se calcula en Valkey, en el servidor.
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
