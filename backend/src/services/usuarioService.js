/**
 * Regras de negócio da administração de usuários.
 */
import { AppError } from '../utils/AppError.js';
import { validar, validarId, validarPaginacao } from '../utils/validacao.js';
import { esquemaAlterarPerfil } from '../validators/authEsquemas.js';

export function criarUsuarioService({ usuarioRepository, logger }) {
  return {
    async buscarPorId(id) {
      return usuarioRepository.buscarPorId(id);
    },

    async listar(query) {
      const paginacao = validarPaginacao(query, { limitePadrao: 20 });
      const resultado = await usuarioRepository.listar(paginacao);
      return { ...resultado, paginacao };
    },

    async alterarPerfil(idBruto, dados, administrador) {
      const id = validarId(idBruto);
      const { perfil } = validar(dados, esquemaAlterarPerfil);

      // Impede que o administrador remova o próprio acesso por engano.
      if (id === administrador.id) {
        throw AppError.conflito('Você não pode alterar o seu próprio perfil.');
      }

      const usuario = await usuarioRepository.alterarPerfil(id, perfil);
      if (!usuario) throw AppError.naoEncontrado('Usuário');
      logger.info('entidade.atualizada', { entidade: 'usuario', id, perfil, por: administrador.id });
      return usuario;
    },
  };
}
