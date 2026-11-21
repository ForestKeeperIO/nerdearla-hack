'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PESTANAS = [
  { href: '/tablero', titulo: 'Tablero' },
  { href: '/reportes', titulo: 'Reportes' },
  { href: '/subir', titulo: 'Subir archivos' },
  { href: '/como-funciona', titulo: 'Cómo funciona' },
  { href: '/valkey', titulo: 'Valkey' },
];

export function NavPrincipal() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones" className="eira-nav">
      {PESTANAS.map((p) => {
        const activo = pathname === p.href || pathname.startsWith(p.href + '/') || (p.href === '/subir' && pathname.startsWith('/informe'));
        return (
          <Link
            key={p.href}
            prefetch={pathname === '/valkey' || p.href === '/valkey' ? false : undefined}
            href={p.href === '/reportes' ? '/reportes?programa=tamizaje-rosa' : p.href}
            aria-current={activo ? 'page' : undefined}
          >
            {p.titulo}
          </Link>
        );
      })}
    </nav>
  );
}
