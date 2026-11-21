import { CargaPrograma } from '@/components/carga-programa';

export const dynamic = 'force-dynamic';

export default async function PaginaSubir({params}:PageProps<'/informe/[alcance]/subir'>) {
  return <CargaPrograma programa={(await params).alcance}/>;
}
