/**
 * Atribui um identificador único a cada requisição (cabeçalho X-Request-Id)
 * e registra método, rota, status e duração no log em nível debug.
 */
import { randomUUID } from 'node:crypto';

export function criarRastreioDeRequisicao({ logger }) {
  return (req, res, next) => {
    req.id = randomUUID();
    res.setHeader('X-Request-Id', req.id);
    const inicio = process.hrtime.bigint();

    res.on('finish', () => {
      const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1e6;
      logger.debug('http.requisicao', {
        requisicaoId: req.id,
        metodo: req.method,
        rota: req.path,
        status: res.statusCode,
        duracaoMs: Number(duracaoMs.toFixed(2)),
        usuarioId: req.usuario?.id ?? null,
      });
    });
    next();
  };
}
