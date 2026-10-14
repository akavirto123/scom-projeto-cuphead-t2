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
import { config as configPadrao } from './config/env.js';
import { logger as loggerPadrao } from './config/logger.js';

import { criarRastreioDeRequisicao } from './middlewares/requisicao.js';
import { criarTratadorDeErros, rotaNaoEncontrada } from './middlewares/tratadorErros.js';
import { criarCarregadorDeUsuario, criarMiddlewareDeSessao } from './middlewares/sessao.js';
import { criarProtecaoCsrf } from './middlewares/csrf.js';
import { criarMiddlewaresDeAcesso } from './middlewares/autorizacao.js';
import { criarLimitadorDaApi, criarLimitadorDeLogin } from './middlewares/limitadores.js';

import { criarUsuarioRepository } from './repositories/usuarioRepository.js';
import { criarIlhaRepository } from './repositories/ilhaRepository.js';
import { criarChefeRepository } from './repositories/chefeRepository.js';
import { criarTaticaRepository } from './repositories/taticaRepository.js';
import { criarConquistaRepository } from './repositories/conquistaRepository.js';

import { criarHasherBcrypt } from './services/hasher.js';
import { criarAuthService } from './services/authService.js';
import { criarUsuarioService } from './services/usuarioService.js';
import { criarChefeService } from './services/chefeService.js';
import { criarTaticaService } from './services/taticaService.js';
import { criarConquistaService } from './services/conquistaService.js';

import { criarAuthController } from './controllers/authController.js';
import { criarUsuarioController } from './controllers/usuarioController.js';
import { criarChefeController } from './controllers/chefeController.js';
import { criarTaticaController } from './controllers/taticaController.js';
import { criarConquistaController } from './controllers/conquistaController.js';

import { criarRotasAuth } from './routes/authRoutes.js';
import { criarRotasUsuarios } from './routes/usuarioRoutes.js';
import { criarRotasChefes, criarRotasIlhas } from './routes/chefeRoutes.js';
import { criarRotasTaticas } from './routes/taticaRoutes.js';
import { criarRotasConquistas } from './routes/conquistaRoutes.js';

/** Content Security Policy: de onde a página pode carregar cada recurso. */
const POLITICA_DE_CONTEUDO = {
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    frameSrc: ['https://scratch.mit.edu'],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  },
};

export function criarApp({ pool, config = configPadrao, logger = loggerPadrao }) {
  // ---- Camada de acesso a dados ----
  const usuarioRepository = criarUsuarioRepository(pool);
  const ilhaRepository = criarIlhaRepository(pool);
  const chefeRepository = criarChefeRepository(pool);
  const taticaRepository = criarTaticaRepository(pool);
  const conquistaRepository = criarConquistaRepository(pool);

  // ---- Camada de lógica de aplicação ----
  const hasher = criarHasherBcrypt(config.seguranca.custoBcrypt);
  const authService = criarAuthService({ usuarioRepository, hasher, logger });
  const usuarioService = criarUsuarioService({ usuarioRepository, logger });
  const chefeService = criarChefeService({ chefeRepository, ilhaRepository, logger });
  const taticaService = criarTaticaService({ taticaRepository, chefeRepository, logger });
  const conquistaService = criarConquistaService({ conquistaRepository });

  // ---- Camada HTTP ----
  const configSessao = config.sessao;
  const authController = criarAuthController({ authService, logger, configSessao });
  const usuarioController = criarUsuarioController({ usuarioService });
  const chefeController = criarChefeController({ chefeService, ilhaRepository });
  const taticaController = criarTaticaController({ taticaService });
  const conquistaController = criarConquistaController({ conquistaService });
  const acesso = criarMiddlewaresDeAcesso({ logger });

  const api = express.Router();
  api.use(criarLimitadorDaApi({ maximoPorMinuto: config.seguranca.limiteApiPorMinuto, logger }));
  api.use(express.json({ limit: '10kb' }));
  api.use(criarMiddlewareDeSessao({ pool, configSessao, emTeste: config.emTeste }));
  api.use(criarCarregadorDeUsuario({ usuarioService }));
  api.use(criarProtecaoCsrf({ logger }));

  api.get('/saude', async (req, res, next) => {
    try {
      await pool.query('SELECT 1');
      res.json({ dados: { status: 'ok', banco: 'ok' } });
    } catch (erro) {
      next(erro);
    }
  });

  const limitadorDeLogin = criarLimitadorDeLogin({
    maximo: config.seguranca.limiteLoginPorJanela,
    janelaMinutos: config.seguranca.janelaLoginMinutos,
    logger,
  });
  api.use('/auth', criarRotasAuth({ authController, acesso, limitadorDeLogin }));
  api.use('/usuarios', criarRotasUsuarios({ usuarioController, acesso }));
  api.use('/ilhas', criarRotasIlhas({ chefeController }));
  api.use('/chefes', criarRotasChefes({ chefeController, taticaController, acesso }));
  api.use('/taticas', criarRotasTaticas({ taticaController, acesso }));
  api.use('/conquistas', criarRotasConquistas({ conquistaController, acesso }));
  api.use(rotaNaoEncontrada);

  // ---- Aplicação ----
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: POLITICA_DE_CONTEUDO }));
  app.use(criarRastreioDeRequisicao({ logger }));
  app.use('/api', api);
  app.use(express.static(path.resolve(config.raizBackend, '..', 'frontend')));
  app.use(criarTratadorDeErros({ logger, emDesenvolvimento: config.emDesenvolvimento }));

  return app;
}
