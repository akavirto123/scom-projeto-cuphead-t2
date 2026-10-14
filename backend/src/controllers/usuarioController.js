/** Camada HTTP da administração de usuários. */
import { metadadosPaginacao, responder, rotaAssincrona } from '../utils/http.js';

export function criarUsuarioController({ usuarioService }) {
  return {
    listar: rotaAssincrona(async (req, res) => {
      const { itens, total, paginacao } = await usuarioService.listar(req.query);
      responder(res, 200, itens, { paginacao: metadadosPaginacao(paginacao, total) });
    }),

    alterarPerfil: rotaAssincrona(async (req, res) => {
      responder(res, 200, await usuarioService.alterarPerfil(req.params.id, req.body, req.usuario));
    }),
  };
}
