/**
 * Camada HTTP da autenticação: traduz requisição -> service -> resposta.
 */
import { rotaAssincrona, responder } from '../utils/http.js';
import { obterTokenCsrf } from '../middlewares/csrf.js';
import { NOME_COOKIE_SESSAO, destruirSessao, opcoesDoCookie, regenerarSessao } from '../middlewares/sessao.js';

export function criarAuthController({ authService, logger, configSessao }) {
  return {
    /** Estado da sessão atual + token CSRF (rota pública). */
    sessao: rotaAssincrona(async (req, res) => {
      responder(res, 200, { usuario: req.usuario ?? null, csrfToken: obterTokenCsrf(req.session) });
    }),

    registrar: rotaAssincrona(async (req, res) => {
      const usuario = await authService.registrar(req.body);
      res.location(`/api/usuarios/${usuario.id}`);
      responder(res, 201, usuario);
    }),

    login: rotaAssincrona(async (req, res) => {
      const usuario = await authService.autenticar(req.body, { ip: req.ip });
      // Novo id de sessão após o login: impede ataques de fixação de sessão.
      await regenerarSessao(req);
      req.session.usuarioId = usuario.id;
      responder(res, 200, { usuario, csrfToken: obterTokenCsrf(req.session) });
    }),

    logout: rotaAssincrona(async (req, res) => {
      const usuarioId = req.usuario.id;
      await destruirSessao(req);
      res.clearCookie(NOME_COOKIE_SESSAO, opcoesDoCookie(configSessao));
      logger.info('auth.logout', { usuarioId });
      res.status(204).end();
    }),

    eu: rotaAssincrona(async (req, res) => {
      responder(res, 200, req.usuario);
    }),
  };
}
