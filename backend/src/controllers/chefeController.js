/** Camada HTTP de chefes e ilhas. */
import { metadadosPaginacao, responder, rotaAssincrona } from '../utils/http.js';

export function criarChefeController({ chefeService, ilhaRepository }) {
  return {
    listarIlhas: rotaAssincrona(async (req, res) => {
      responder(res, 200, await ilhaRepository.listar());
    }),

    listar: rotaAssincrona(async (req, res) => {
      const { itens, total, paginacao } = await chefeService.listar(req.query);
      responder(res, 200, itens, { paginacao: metadadosPaginacao(paginacao, total) });
    }),

    obter: rotaAssincrona(async (req, res) => {
      responder(res, 200, await chefeService.obter(req.params.id));
    }),

    criar: rotaAssincrona(async (req, res) => {
      const chefe = await chefeService.criar(req.body, req.usuario);
      res.location(`/api/chefes/${chefe.id}`);
      responder(res, 201, chefe);
    }),

    atualizar: rotaAssincrona(async (req, res) => {
      responder(res, 200, await chefeService.atualizar(req.params.id, req.body, req.usuario));
    }),

    excluir: rotaAssincrona(async (req, res) => {
      await chefeService.excluir(req.params.id, req.usuario);
      res.status(204).end();
    }),
  };
}
