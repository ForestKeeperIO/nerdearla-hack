'use client';

// Navegación superior: dos pestañas (Tablero | Informes) marcando la activa.
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PESTANAS = [
  { href: '/tablero', titulo: 'Tablero' },
  { href: '/informe', titulo: 'Informes' },
];

export function NavPrincipal() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones" style={{ display: 'flex', gap: 'var(--sp-1)' }}>
      {PESTANAS.map((p) => {
        const activo = pathname === p.href || (p.href === '/informe' && pathname.startsWith('/informe'));
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={activo ? 'page' : undefined}
            className="no-underline"
            style={{
              padding: 'var(--sp-2) var(--sp-3)',
              fontSize: 'var(--fs-small)',
              fontWeight: activo ? 600 : 400,
              color: activo ? 'var(--vino)' : 'var(--tinta-suave)',
              borderBottom: activo ? '2px solid var(--vino)' : '2px solid transparent',
            }}
          >
            {p.titulo}
          </Link>
        );
      })}
    </nav>
  );
}
