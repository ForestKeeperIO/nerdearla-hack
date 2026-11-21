import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Iniciativa } from '@/lib/catalogo';
import './programa-carga.css';

export function ElegirProgramaCarga({ programas }: { programas: Iniciativa[] }) {
  return <div className="archivo-eira expediente-carga">
    <header className="apertura">
      <h1>¿De qué programa es este archivo?</h1>
      <p>Elige el programa que organizó la actividad. Después podrás revisar el archivo antes de enviarlo.</p>
    </header>
    <nav className="programas-carga programas-eleccion" aria-label="Elegir programa de la carga">
      {[...programas, { id: 'otro', nombre: 'Otro programa', descripcion: 'Busca por nombre y comprueba si ya está dado de alta.' }].map(p =>
        <Link key={p.id} aria-label={p.nombre} href={p.id === 'otro' ? '/subir?otro=1' : `/informe/${p.id}/subir`}>
          <span><strong>{p.nombre}</strong><small>{p.descripcion}</small></span>
          <ArrowUpRight aria-hidden />
        </Link>)}
    </nav>
  </div>;
}
