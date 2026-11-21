import { expect, it } from 'vitest';
import { entradaSegura } from './monitor-valkey';

it('no refleja identificadores, campos desconocidos ni texto libre en campos permitidos', () => {
  const secreto = 'dato privado';
  const campos = entradaSegura(['id', secreto, 'nombre', secreto, secreto, 'x', 'tipo', secreto,
    'programa', secreto, 'estado', secreto, 'hora', secreto]);
  expect(JSON.stringify(campos)).not.toContain(secreto);
  expect(campos.map(c => c.campo)).toEqual(['id', 'nombre', 'tipo', 'programa', 'estado', 'hora']);
  expect(campos.every(c => c.valor === null)).toBe(true);
});

it('proyecta únicamente valores públicos reconocidos', () => {
  expect(entradaSegura(['programa','tamizaje-rosa','tipo','persona','estado','listo','hora','16:08:43'])
    .map(c => c.valor)).toEqual(['Tamizaje Rosa','persona','listo','16:08:43']);
});
