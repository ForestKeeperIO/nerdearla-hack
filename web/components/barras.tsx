'use client';

import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { CiudadConteo } from '@/lib/comun';

/** Barras horizontales de personas únicas por ciudad. Valores <5 se muestran como "<5". */
export function BarrasCiudad({ datos }: { datos: CiudadConteo[] }) {
  return (
    <div style={{ width: '100%', height: Math.max(220, datos.length * 56) }} role="img" aria-label="Gráfica de barras: personas únicas por ciudad">
      <ResponsiveContainer>
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="ciudad"
            width={170}
            tick={{ fontSize: 16, fill: 'var(--color-ink-2)' }}
            tickLine={false}
            axisLine={false}
          />
          <Bar dataKey="personas" fill="var(--color-accent-2)" radius={[0, 6, 6, 0]} barSize={26} minPointSize={4} isAnimationActive={false}>
            <LabelList
              dataKey="personas"
              position="right"
              formatter={(v) => (Number(v) < 5 ? '<5' : String(v))}
              style={{ fontSize: 16, fill: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
