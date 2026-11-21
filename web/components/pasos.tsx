'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Stepper, type PasoStepper } from '@/components/ui/stepper';

const PASOS: (PasoStepper & { href: string })[] = [
  { id: 'subir', titulo: 'Subir', href: '/' },
  { id: 'calidad', titulo: 'Calidad', href: '/calidad' },
  { id: 'tablero', titulo: 'Vista previa', href: '/tablero' },
  { id: 'informe', titulo: 'Exportar', href: '/informe' },
];

export function PasosCabecera() {
  const ruta = usePathname();
  const router = useRouter();
  // En /registro (fuera del flujo) ningún paso queda como actual ni completo.
  const actual = PASOS.findIndex((p) => (p.href === '/' ? ruta === '/' : ruta.startsWith(p.href)));

  return (
    <Stepper
      pasos={PASOS}
      actual={actual}
      onSeleccionar={(i) => router.push(PASOS[i].href)}
      className="max-w-2xl"
    />
  );
}
