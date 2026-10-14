/**
 * Proteção de rotas: autenticação (401) e autorização por perfil (403).
 */
import { AppError } from '../utils/AppError.js';
import { PERFIS, perfilDe, pode } from '../domain/permissoes.js';
import { rotaDe } from '../utils/http.js';

function registrarNegacao(logger, req, acao) {
  logger.aviso('acesso.negado', {
    requisicaoId: req.id,
    metodo: req.method,
    rota: rotaDe(req),
    acao,
    usuarioId: req.usuario?.id ?? null,
    perfil: perfilDe(req.usuario),
    ip: req.ip,
  });
}

export function criarMiddlewaresDeAcesso({ logger }) {
  return {
    /** Exige apenas que exista um usuário logado. */
    exigirAutenticacao(req, res, next) {
      if (req.usuario) return next();
      registrarNegacao(logger, req, 'autenticacao');
      next(AppError.naoAutenticado());
    },

    /** Exige que o perfil do usuário tenha a permissão na matriz. */
    exigirPermissao(acao) {
      return (req, res, next) => {
        const perfil = perfilDe(req.usuario);
        if (pode(perfil, acao)) return next();

        registrarNegacao(logger, req, acao);
        next(perfil === PERFIS.VISITANTE ? AppError.naoAutenticado() : AppError.acessoNegado());
      };
    },
  };
}
