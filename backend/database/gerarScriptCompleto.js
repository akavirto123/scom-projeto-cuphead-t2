/**
 * Gera database/script_completo.sql juntando todas as migrações.
 * Esse arquivo é o "script de criação do banco" exigido na entrega e pode
 * ser executado direto no psql ou no pgAdmin, sem Node.js.
 *
 *   npm run db:script
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { PASTA_MIGRACOES, listarArquivosDeMigracao } from './migracoes.js';

const destino = path.join(PASTA_MIGRACOES, '..', 'script_completo.sql');
const partes = [
  '-- =====================================================================',
  '-- Cuphead Boss Guide - script completo de criação do banco (PostgreSQL)',
  '-- Gerado automaticamente por "npm run db:script" a partir de',
  '-- database/migrations/. Não edite este arquivo à mão.',
  '--',
  '-- Uso (em um banco vazio):',
  '--   psql -U cuphead_app -d cuphead_guide -f database/script_completo.sql',
  '-- =====================================================================',
  '',
  'BEGIN;',
  '',
];

for (const arquivo of await listarArquivosDeMigracao()) {
  const sql = await fs.readFile(path.join(PASTA_MIGRACOES, arquivo), 'utf8');
  partes.push(`-- >>> ${arquivo}`, sql.trim(), '');
}

partes.push('COMMIT;', '');
await fs.writeFile(destino, partes.join('\n'), 'utf8');
console.log(`Gerado: ${path.relative(process.cwd(), destino)}`);
