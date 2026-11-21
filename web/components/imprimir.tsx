'use client';

import { Button } from '@/components/ui/button';

export function BotonImprimir() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      Imprimir o guardar PDF
    </Button>
  );
}
