'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PESTANAS = [
  { href: '/tablero', titulo: 'Tablero' },
  { href: '/reportes', titulo: 'Reportes' },
  { href: '/subir', titulo: 'Subir archivos' },
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
            href={p.href}
            aria-current={activo ? 'page' : undefined}
          >
            {p.titulo}
          </Link>
        );
      })}
    </nav>
  );
}
