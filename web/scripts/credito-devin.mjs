import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const destino = new URL('../lib/credito-devin.json', import.meta.url);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
// Las entregas por git archive no llevan .git: conservan el corte versionado.
let repo;
try { repo = git('rev-parse', '--show-prefix') === 'web/'; } catch { repo = false; }
if (!repo || git('rev-parse', '--is-shallow-repository') === 'true') {
  if (!existsSync(destino)) throw new Error('No hay historial completo ni corte de autoría.');
  console.log('Devin: se conserva el corte de Git incluido en la entrega.');
} else {
  const ramas = git('for-each-ref', '--format=%(refname:strip=3)', 'refs/remotes/origin')
    .split('\n').filter(r => r && r !== 'HEAD' && !/^(soe_|selma)/i.test(r));
  if (!ramas.length && existsSync(destino)) {
    console.log('Devin: sin ramas remotas locales; se conserva el corte versionado.');
  } else {
    const log = git('log', '--format=%H%x1f%an%x1f%(trailers:key=Co-authored-by,valueonly,separator=%x0a)%x1e',
      'HEAD', ...ramas.map(r => `origin/${r}`));
    const acreditados = new Set(log.split('\x1e').map(s => s.trim().split('\x1f'))
      .filter(([,autor,otros]) => /^Devin$/i.test(autor) || /^Devin\s*</im.test(otros || ''))
      .map(([sha]) => sha));
    const linea = r => git('rev-list', '--first-parent', `origin/${r}`).split('\n');
    const principal = new Set(ramas.includes('main') ? linea('main') : []);
    const conCredito = ramas.filter(r => linea(r).some(sha =>
      acreditados.has(sha) && (r === 'main' || !principal.has(sha))));
    const ejemplos = [
      ['db8f0ca', 'Motor de deduplicación de Excel y CSV', 'motor'],
      ['2ce6365', 'Tablero con filtros por programa y periodo', 'fe'],
      ['2d19cdc', 'Tableros de impacto y calidad en Metabase', 'metabase'],
    ].filter(([sha]) => [...acreditados].some(id => id.startsWith(sha)))
      .map(([sha, titulo, rama]) => ({
        sha, titulo, rama: ramas.includes(rama) && git('branch', '-r', '--contains', sha, '--list', `origin/${rama}`)
          ? rama : null,
      }));
    writeFileSync(destino, JSON.stringify({
      corte: git('rev-parse', '--short', 'HEAD'), total: acreditados.size, ramas: conCredito, ejemplos,
    }, null, 2) + '\n');
    console.log(`Devin: ${acreditados.size} commits únicos acreditados.`);
  }
}
