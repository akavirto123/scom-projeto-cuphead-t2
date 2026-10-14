/**
 * CLI: aplica as migrações pendentes.
 *
 *   npm run db:migrar     -> aplica somente o que falta
 *   npm run db:resetar    -> apaga TODAS as tabelas e recria do zero
 */
import { config } from '../src/config/env.js';
import { criarPool } from '../src/config/database.js';
import { executarMigracoes } from './migracoes.js';

const resetar = process.argv.includes('--resetar');

if (resetar && config.emProducao) {
  console.error('Recusado: --resetar não pode ser usado com NODE_ENV=production.');
  process.exit(1);
}

const pool = criarPool();
try {
  console.log(`Banco: ${config.banco.nome}@${config.banco.host}${resetar ? ' (resetando)' : ''}`);
  const aplicadas = await executarMigracoes(pool, {
    resetar,
    aoAplicar: (arquivo) => console.log(`  ✔ ${arquivo}`),
  });
  console.log(aplicadas.length ? `${aplicadas.length} migração(ões) aplicada(s).` : 'Banco já está atualizado.');
} catch (erro) {
  console.error(erro.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
