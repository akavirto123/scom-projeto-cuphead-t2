/**
 * Erro de aplicação "esperado" (regra de negócio, validação, permissão).
 * O tratador central de erros converte estes objetos em respostas JSON
 * padronizadas, com o status HTTP correspondente.
 */
export class AppError extends Error {
  constructor(status, codigo, mensagem, detalhes = undefined) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }

  static requisicaoInvalida(mensagem, detalhes) {
    return new AppError(400, 'REQUISICAO_INVALIDA', mensagem, detalhes);
  }

  static validacao(detalhes) {
    return new AppError(422, 'VALIDACAO', 'Os dados enviados são inválidos.', detalhes);
  }

  static naoAutenticado(mensagem = 'É necessário fazer login para acessar este recurso.') {
    return new AppError(401, 'NAO_AUTENTICADO', mensagem);
  }

  static acessoNegado(mensagem = 'Seu perfil não tem permissão para esta ação.') {
    return new AppError(403, 'ACESSO_NEGADO', mensagem);
  }

  static naoEncontrado(recurso = 'Recurso', { feminino = false } = {}) {
    return new AppError(404, 'NAO_ENCONTRADO', `${recurso} não encontrad${feminino ? 'a' : 'o'}.`);
  }

  static conflito(mensagem) {
    return new AppError(409, 'CONFLITO', mensagem);
  }
}
