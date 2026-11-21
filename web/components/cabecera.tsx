'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PASOS = [
  { href: '/', rotulo: '1 · Subir' },
  { href: '/calidad', rotulo: '2 · Calidad' },
  { href: '/tablero', rotulo: '3 · Vista previa' },
  { href: '/informe', rotulo: '4 · Exportar' },
];

export function NavPasos() {
  const ruta = usePathname();
  return (
    <nav aria-label="Pasos" className="flex flex-wrap items-center gap-1">
      {PASOS.map((p) => {
        const activo = p.href === '/' ? ruta === '/' : ruta.startsWith(p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={activo ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-3 font-medium no-underline ${
              activo ? 'bg-[var(--color-board)] text-[var(--color-board-type)]' : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)]'
            }`}
          >
            {p.rotulo}
          </Link>
        );
      })}
      <Link
        href="/registro"
        aria-current={ruta.startsWith('/registro') ? 'page' : undefined}
        className={`inline-flex min-h-11 items-center rounded-lg px-3 font-medium no-underline ${
          ruta.startsWith('/registro') ? 'bg-[var(--color-board)] text-[var(--color-board-type)]' : 'text-[var(--color-muted)] hover:bg-[var(--color-paper-2)]'
        }`}
      >
        Registro con tarjeta
      </Link>
    </nav>
  );
}
