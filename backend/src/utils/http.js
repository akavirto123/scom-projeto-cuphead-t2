/**
 * Utilitários HTTP reutilizados por todos os controllers.
 */

/**
 * Envolve um handler assíncrono para que erros (promises rejeitadas)
 * sejam encaminhados ao tratador central via `next(erro)`.
 */
export const rotaAssincrona = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

/** Resposta de sucesso padronizada: { dados, [paginacao] }. */
export function responder(res, status, dados, extras = {}) {
  return res.status(status).json({ dados, ...extras });
}

/** Metadados de paginação a partir do total de registros. */
export function metadadosPaginacao({ pagina, limite }, total) {
  return {
    pagina,
    limite,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / limite)),
  };
}

/** Caminho completo da requisição, sem a query string (para logs). */
export function rotaDe(req) {
  return req.originalUrl.split('?')[0];
}
