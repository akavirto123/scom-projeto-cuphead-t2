/** Camada HTTP das conquistas. */
import { responder, rotaAssincrona } from '../utils/http.js';

export function criarConquistaController({ conquistaService }) {
  return {
    listar: rotaAssincrona(async (req, res) => {
      responder(res, 200, await conquistaService.listar());
    }),

    progresso: rotaAssincrona(async (req, res) => {
      responder(res, 200, await conquistaService.progresso(req.usuario));
    }),

    marcar: rotaAssincrona(async (req, res) => {
      await conquistaService.marcar(req.params.id, req.usuario);
      res.status(204).end();
    }),

    desmarcar: rotaAssincrona(async (req, res) => {
      await conquistaService.desmarcar(req.params.id, req.usuario);
      res.status(204).end();
    }),
  };
}
