/**
 * Regras de negócio de chefes (entidade principal do guia).
 */
import { AppError } from '../utils/AppError.js';
import { validar, validarId, validarPaginacao } from '../utils/validacao.js';
import { esquemaChefe, esquemaFiltroChefes } from '../validators/chefeEsquemas.js';

export function criarChefeService({ chefeRepository, ilhaRepository, logger }) {
  async function validarDados(dados, idAtual = null) {
    const chefe = validar(dados, esquemaChefe);
    const erros = [];
    if (!(await ilhaRepository.existe(chefe.ilhaId))) {
      erros.push({ campo: 'ilhaId', mensagem: 'ilha inexistente.' });
    }
    if (erros.length) throw AppError.validacao(erros);
    if (await chefeRepository.existeNome(chefe.nome, idAtual)) {
      throw AppError.conflito('Já existe um chefe com este nome.');
    }
    return chefe;
  }

  return {
    async listar(query) {
      const paginacao = validarPaginacao(query, { limitePadrao: 6, limiteMaximo: 50 });
      const { ilha, busca } = validar(query, esquemaFiltroChefes);
      const resultado = await chefeRepository.listar({ ilhaId: ilha, busca, ...paginacao });
      return { ...resultado, paginacao };
    },

    async obter(idBruto) {
      const chefe = await chefeRepository.buscarPorId(validarId(idBruto));
      if (!chefe) throw AppError.naoEncontrado('Chefe');
      return chefe;
    },

    async criar(dados, autor) {
      const chefe = await validarDados(dados);
      const criado = await chefeRepository.criar({ ...chefe, criadoPor: autor.id });
      logger.info('entidade.criada', { entidade: 'chefe', id: criado.id, por: autor.id });
      return criado;
    },

    async atualizar(idBruto, dados, autor) {
      const id = validarId(idBruto);
      if (!(await chefeRepository.existe(id))) throw AppError.naoEncontrado('Chefe');
      const chefe = await validarDados(dados, id);
      const atualizado = await chefeRepository.atualizar(id, chefe);
      logger.info('entidade.atualizada', { entidade: 'chefe', id, por: autor.id });
      return atualizado;
    },

    async excluir(idBruto, autor) {
      const id = validarId(idBruto);
      if (!(await chefeRepository.excluir(id))) throw AppError.naoEncontrado('Chefe');
      logger.info('entidade.excluida', { entidade: 'chefe', id, por: autor.id });
    },
  };
}
