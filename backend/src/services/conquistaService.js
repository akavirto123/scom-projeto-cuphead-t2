/**
 * Regras de negócio das conquistas: catálogo público e progresso pessoal.
 */
import { AppError } from '../utils/AppError.js';
import { validarId } from '../utils/validacao.js';

export function criarConquistaService({ conquistaRepository }) {
  async function idExistente(idBruto) {
    const id = validarId(idBruto);
    if (!(await conquistaRepository.existe(id))) throw AppError.naoEncontrado('Conquista', { feminino: true });
    return id;
  }

  return {
    listar: () => conquistaRepository.listar(),

    async progresso(usuario) {
      const [todas, concluidas] = await Promise.all([
        conquistaRepository.listar(),
        conquistaRepository.listarConcluidas(usuario.id),
      ]);
      return {
        total: todas.length,
        concluidas: concluidas.length,
        percentual: todas.length ? Math.round((concluidas.length / todas.length) * 100) : 0,
        itens: concluidas,
      };
    },

    async marcar(idBruto, usuario) {
      await conquistaRepository.marcar(usuario.id, await idExistente(idBruto));
    },

    async desmarcar(idBruto, usuario) {
      await conquistaRepository.desmarcar(usuario.id, await idExistente(idBruto));
    },
  };
}
