/**
 * Ponto de entrada: cria o pool do banco, monta a aplicação e sobe o
 * servidor HTTP. Também trata o encerramento gracioso (Ctrl+C).
 */
import { config } from './config/env.js';
import { criarPool } from './config/database.js';
import { logger, encerrarLogger } from './config/logger.js';
import { criarApp } from './app.js';

const pool = criarPool();
const app = criarApp({ pool });

const servidor = app.listen(config.porta, () => {
  logger.info('servidor.iniciado', { porta: config.porta, ambiente: config.ambiente });
  if (!config.emTeste) console.log(`\n  Cuphead Boss Guide rodando em http://localhost:${config.porta}\n`);
});

async function encerrar(sinal) {
  logger.info('servidor.encerrando', { sinal });
  servidor.close(async () => {
    await pool.end();
    await encerrarLogger();
    process.exit(0);
  });
}

process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
process.on('unhandledRejection', (motivo) => {
  logger.erro('erro.interno', { origem: 'unhandledRejection', mensagem: String(motivo?.message ?? motivo), stack: motivo?.stack });
});
