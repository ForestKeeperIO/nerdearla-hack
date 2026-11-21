'use client';

import { useFormStatus } from 'react-dom';
import { FilePlus2 } from 'lucide-react';

export function BotonGenerar({texto='Generar reporte'}:{texto?:string}) {
  const {pending}=useFormStatus();
  return <button type="submit" className="btn btn--primario" disabled={pending}><FilePlus2 aria-hidden/>{pending?'Guardando reporte…':texto}</button>;
}
