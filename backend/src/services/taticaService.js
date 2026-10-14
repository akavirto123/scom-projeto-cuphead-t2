/**
 * Regras de negócio das táticas sugeridas pela comunidade.
 *
 * Fluxo: o jogador envia uma tática (status "pendente"); o administrador
 * aprova ou rejeita. Só táticas aprovadas aparecem no guia público. O autor
 * pode editar ou excluir a própria tática apenas enquanto ela estiver
 * pendente.
 */
import { AppError } from '../utils/AppError.js';
import { validar, validarId, validarPaginacao } from '../utils/validacao.js';
import { perfilDe, pode } from '../domain/permissoes.js';
import {
  esquemaEditarTatica,
  esquemaFiltroTaticas,
  esquemaModerarTatica,
  esquemaNovaTatica,
} from '../validators/taticaEsquemas.js';

export function criarTaticaService({ taticaRepository, chefeRepository, logger }) {
  async function buscarOuFalhar(idBruto) {
    const tatica = await taticaRepository.buscarPorId(validarId(idBruto));
    if (!tatica) throw AppError.naoEncontrado('Tática', { feminino: true });
    return tatica;
  }

  /** Garante que o usuário é o autor e que a tática ainda está pendente. */
  function exigirAutorComPendente(tatica, usuario) {
    if (tatica.usuarioId !== usuario.id) {
      throw AppError.acessoNegado('Você só pode alterar as suas próprias táticas.');
    }
    if (tatica.status !== 'pendente') {
      throw AppError.conflito('Táticas já moderadas não podem ser alteradas.');
    }
  }

  return {
    async listarAprovadasDoChefe(idBruto) {
      const chefeId = validarId(idBruto);
      if (!(await chefeRepository.existe(chefeId))) throw AppError.naoEncontrado('Chefe');
      return taticaRepository.listarAprovadasDoChefe(chefeId);
    },

    async listarDoUsuario(usuario) {
      return taticaRepository.listarDoUsuario(usuario.id);
    },

    async listarParaModeracao(query) {
      const paginacao = validarPaginacao(query, { limitePadrao: 20 });
      const { status } = validar(query, esquemaFiltroTaticas);
      const resultado = await taticaRepository.listarPorStatus({ status, ...paginacao });
      return { ...resultado, paginacao };
    },

    async criar(dados, usuario) {
      const { chefeId, conteudo } = validar(dados, esquemaNovaTatica);
      if (!(await chefeRepository.existe(chefeId))) {
        throw AppError.validacao([{ campo: 'chefeId', mensagem: 'chefe inexistente.' }]);
      }
      const tatica = await taticaRepository.criar({ chefeId, usuarioId: usuario.id, conteudo });
      logger.info('entidade.criada', { entidade: 'tatica', id: tatica.id, chefeId, por: usuario.id });
      return tatica;
    },

    async editar(idBruto, dados, usuario) {
      const tatica = await buscarOuFalhar(idBruto);
      exigirAutorComPendente(tatica, usuario);
      const { conteudo } = validar(dados, esquemaEditarTatica);
      const atualizada = await taticaRepository.atualizarConteudo(tatica.id, conteudo);
      logger.info('entidade.atualizada', { entidade: 'tatica', id: tatica.id, por: usuario.id });
      return atualizada;
    },

    async moderar(idBruto, dados, moderador) {
      const tatica = await buscarOuFalhar(idBruto);
      const { status } = validar(dados, esquemaModerarTatica);
      const moderada = await taticaRepository.moderar(tatica.id, { status, moderadorId: moderador.id });
      logger.info('entidade.atualizada', { entidade: 'tatica', id: tatica.id, status, por: moderador.id });
      return moderada;
    },

    async excluir(idBruto, usuario) {
      const tatica = await buscarOuFalhar(idBruto);
      // Administrador pode excluir qualquer tática; os demais, só as próprias pendentes.
      if (!pode(perfilDe(usuario), 'tatica:moderar')) {
        exigirAutorComPendente(tatica, usuario);
      }
      await taticaRepository.excluir(tatica.id);
      logger.info('entidade.excluida', { entidade: 'tatica', id: tatica.id, por: usuario.id });
    },
  };
}
