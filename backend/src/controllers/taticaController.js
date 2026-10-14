/** Camada HTTP das táticas da comunidade. */
import { metadadosPaginacao, responder, rotaAssincrona } from '../utils/http.js';

export function criarTaticaController({ taticaService }) {
  return {
    listarDoChefe: rotaAssincrona(async (req, res) => {
      responder(res, 200, await taticaService.listarAprovadasDoChefe(req.params.id));
    }),

    listarMinhas: rotaAssincrona(async (req, res) => {
      responder(res, 200, await taticaService.listarDoUsuario(req.usuario));
    }),

    listarParaModeracao: rotaAssincrona(async (req, res) => {
      const { itens, total, paginacao } = await taticaService.listarParaModeracao(req.query);
      responder(res, 200, itens, { paginacao: metadadosPaginacao(paginacao, total) });
    }),

    criar: rotaAssincrona(async (req, res) => {
      const tatica = await taticaService.criar(req.body, req.usuario);
      res.location(`/api/taticas/${tatica.id}`);
      responder(res, 201, tatica);
    }),

    editar: rotaAssincrona(async (req, res) => {
      responder(res, 200, await taticaService.editar(req.params.id, req.body, req.usuario));
    }),

    moderar: rotaAssincrona(async (req, res) => {
      responder(res, 200, await taticaService.moderar(req.params.id, req.body, req.usuario));
    }),

    excluir: rotaAssincrona(async (req, res) => {
      await taticaService.excluir(req.params.id, req.usuario);
      res.status(204).end();
    }),
  };
}
