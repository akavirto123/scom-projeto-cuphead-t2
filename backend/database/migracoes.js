/**
 * Executor de migrações do banco de dados.
 *
 * Cada arquivo em database/migrations/ (NNN_descricao.sql) é aplicado uma
 * única vez, em ordem, dentro de uma transação. A tabela schema_migrations
 * guarda quais já foram aplicadas, então rodar de novo é seguro.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PASTA_MIGRACOES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function listarArquivosDeMigracao() {
  const arquivos = await fs.readdir(PASTA_MIGRACOES);
  return arquivos.filter((nome) => /^\d{3}_.+\.sql$/.test(nome)).sort();
}

// Objetos criados pelas migrações, na ordem segura de remoção (usado por
// --resetar e pelos testes). Listados explicitamente para nunca apagar nada
// que não pertença a este projeto.
const OBJETOS_DO_PROJETO = `
  DROP TABLE IF EXISTS usuario_conquistas, conquistas, taticas, chefes, ilhas,
                       sessoes, usuarios, schema_migrations CASCADE;
  DROP FUNCTION IF EXISTS definir_atualizado_em() CASCADE;`;

export async function executarMigracoes(pool, { resetar = false, aoAplicar = () => {} } = {}) {
  if (resetar) {
    await pool.query(OBJETOS_DO_PROJETO);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nome        VARCHAR(255) NOT NULL,
      aplicada_em TIMESTAMPTZ  NOT NULL DEFAULT now(),
      CONSTRAINT pk_schema_migrations PRIMARY KEY (nome)
    )`);

  const { rows } = await pool.query('SELECT nome FROM schema_migrations');
  const aplicadas = new Set(rows.map((linha) => linha.nome));
  const novas = [];

  for (const arquivo of await listarArquivosDeMigracao()) {
    if (aplicadas.has(arquivo)) continue;
    const sql = await fs.readFile(path.join(PASTA_MIGRACOES, arquivo), 'utf8');
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(sql);
      await cliente.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [arquivo]);
      await cliente.query('COMMIT');
      novas.push(arquivo);
      aoAplicar(arquivo);
    } catch (erro) {
      await cliente.query('ROLLBACK');
      erro.message = `Falha na migração ${arquivo}: ${erro.message}`;
      throw erro;
    } finally {
      cliente.release();
    }
  }
  return novas;
}
