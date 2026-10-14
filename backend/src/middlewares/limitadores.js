/**
 * Rate limiting simples (em memória, por endereço IP).
 *
 * - Login: limita tentativas malsucedidas para dificultar ataques de força
 *   bruta contra senhas. Logins bem-sucedidos não contam.
 * - API em geral: teto de requisições por minuto.
 */
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../utils/AppError.js';
import { rotaDe } from '../utils/http.js';

function aoExceder(logger, tipo, mensagem) {
  return (req, res, next) => {
    logger.aviso('seguranca.rate_limit', { tipo, ip: req.ip, rota: rotaDe(req), requisicaoId: req.id });
    next(new AppError(429, 'MUITAS_REQUISICOES', mensagem));
  };
}

export function criarLimitadorDeLogin({ maximo, janelaMinutos, logger }) {
  return rateLimit({
    windowMs: janelaMinutos * 60 * 1000,
    limit: maximo,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: aoExceder(logger, 'login', `Muitas tentativas de login. Aguarde ${janelaMinutos} minutos e tente novamente.`),
  });
}

export function criarLimitadorDaApi({ maximoPorMinuto, logger }) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: maximoPorMinuto,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: aoExceder(logger, 'api', 'Muitas requisições em pouco tempo. Aguarde um instante.'),
  });
}
