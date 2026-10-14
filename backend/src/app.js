/**
 * Montagem da aplicação Express (composition root).
 *
 * Aqui as camadas são "ligadas": repositories recebem o pool do banco,
 * services recebem repositories, controllers recebem services e as rotas
 * recebem controllers. Nenhuma camada cria suas próprias dependências,
 * o que permite testar cada uma isoladamente.
 */
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { criarRastreioDeRequisicao } from './middlewares/requisicao.js';
import { criarTratadorDeErros, rotaNaoEncontrada } from './middlewares/tratadorErros.js';

const PASTA_FRONTEND = path.resolve(config.raizBackend, '..', 'frontend');

export function criarApp({ pool }) {
  const app = express();

  app.use(helmet());
  app.use(criarRastreioDeRequisicao({ logger }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/saude', async (req, res, next) => {
    try {
      await pool.query('SELECT 1');
      res.json({ dados: { status: 'ok', banco: 'ok' } });
    } catch (erro) {
      next(erro);
    }
  });

  app.use('/api', rotaNaoEncontrada);
  app.use(express.static(PASTA_FRONTEND));
  app.use(criarTratadorDeErros({ logger, emDesenvolvimento: config.emDesenvolvimento }));

  return app;
}
