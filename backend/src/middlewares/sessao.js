/**
 * Sessão segura armazenada no PostgreSQL (tabela "sessoes").
 *
 * - O navegador recebe apenas um identificador aleatório assinado
 *   (cookie "cuphead.sid"); os dados da sessão ficam no servidor.
 * - HttpOnly: o JavaScript da página não consegue ler o cookie (mitiga
 *   roubo de sessão via XSS).
 * - SameSite=Strict: o navegador não envia o cookie em requisições
 *   originadas de outros sites (primeira barreira contra CSRF).
 * - Secure (produção/HTTPS): o cookie só trafega criptografado.
 * - Expira após SESSION_MAX_AGE_MIN minutos sem uso (rolling).
 */
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

const PgStore = connectPgSimple(session);
export const NOME_COOKIE_SESSAO = 'cuphead.sid';

export function opcoesDoCookie(configSessao) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: configSessao.cookieSeguro,
    path: '/',
  };
}

export function criarMiddlewareDeSessao({ pool, configSessao, emTeste }) {
  return session({
    name: NOME_COOKIE_SESSAO,
    secret: configSessao.segredo,
    store: new PgStore({
      pool,
      tableName: 'sessoes',
      createTableIfMissing: false,
      // Nos testes a limpeza automática fica desligada para não manter
      // timers ativos depois que a suíte termina.
      pruneSessionInterval: emTeste ? false : 15 * 60,
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { ...opcoesDoCookie(configSessao), maxAge: configSessao.duracaoMinutos * 60 * 1000 },
  });
}

/**
 * Carrega o usuário da sessão a partir do banco a cada requisição. Assim,
 * uma mudança de perfil ou a exclusão da conta vale imediatamente, sem
 * depender de dados antigos guardados na sessão.
 */
export function criarCarregadorDeUsuario({ usuarioService }) {
  return async (req, res, next) => {
    try {
      const id = req.session?.usuarioId;
      if (id) {
        req.usuario = await usuarioService.buscarPorId(id);
        if (!req.usuario) delete req.session.usuarioId;
      }
      next();
    } catch (erro) {
      next(erro);
    }
  };
}

/** Versões em Promise de regenerate/destroy do express-session. */
export const regenerarSessao = (req) =>
  new Promise((resolve, reject) => req.session.regenerate((erro) => (erro ? reject(erro) : resolve())));

export const destruirSessao = (req) =>
  new Promise((resolve, reject) => req.session.destroy((erro) => (erro ? reject(erro) : resolve())));
