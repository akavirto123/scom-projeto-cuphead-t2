/**
 * Proteção contra CSRF (Cross-Site Request Forgery) com "synchronizer token".
 *
 * Cada sessão recebe um token aleatório de 256 bits. O frontend obtém o
 * token em GET /api/auth/sessao e o envia no cabeçalho X-CSRF-Token em toda
 * requisição que altera estado (POST, PUT, PATCH, DELETE). Um site
 * malicioso não consegue ler esse token, então não consegue forjar a
 * requisição, mesmo que o navegador envie o cookie de sessão.
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '../utils/AppError.js';
import { rotaDe } from '../utils/http.js';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CABECALHO_CSRF = 'X-CSRF-Token';

export function obterTokenCsrf(sessao) {
  if (!sessao.csrfToken) sessao.csrfToken = randomBytes(32).toString('base64url');
  return sessao.csrfToken;
}

function tokensIguais(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function criarProtecaoCsrf({ logger }) {
  return (req, res, next) => {
    if (METODOS_SEGUROS.has(req.method)) return next();

    const esperado = req.session?.csrfToken;
    const recebido = req.get(CABECALHO_CSRF);

    if (!esperado || typeof recebido !== 'string' || !tokensIguais(esperado, recebido)) {
      logger.aviso('seguranca.csrf_invalido', {
        requisicaoId: req.id,
        metodo: req.method,
        rota: rotaDe(req),
        ip: req.ip,
        motivo: !esperado ? 'sessao_sem_token' : !recebido ? 'cabecalho_ausente' : 'token_diferente',
      });
      return next(new AppError(403, 'CSRF_INVALIDO', 'Token CSRF ausente ou inválido. Recarregue a página e tente novamente.'));
    }
    next();
  };
}
