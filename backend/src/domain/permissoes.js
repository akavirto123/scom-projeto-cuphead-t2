/**
 * Matriz de permissões (controle de acesso baseado em perfis - RBAC).
 *
 * Este arquivo é a fonte única de verdade sobre "quem pode fazer o quê".
 * As rotas consultam esta matriz pelo middleware `exigirPermissao(acao)` e
 * o relatório reproduz a mesma tabela.
 *
 * Perfis:
 *   visitante  usuário sem login
 *   jogador    usuário cadastrado (perfil padrão no cadastro)
 *   admin      administrador do guia
 */
export const PERFIS = Object.freeze({
  VISITANTE: 'visitante',
  JOGADOR: 'jogador',
  ADMIN: 'admin',
});

const { VISITANTE, JOGADOR, ADMIN } = PERFIS;
const TODOS = [VISITANTE, JOGADOR, ADMIN];
const AUTENTICADOS = [JOGADOR, ADMIN];

export const MATRIZ_PERMISSOES = Object.freeze({
  'chefe:listar': TODOS,
  'chefe:criar': [ADMIN],
  'chefe:editar': [ADMIN],
  'chefe:excluir': [ADMIN],

  'tatica:listar_aprovadas': TODOS,
  'tatica:criar': AUTENTICADOS,
  'tatica:listar_proprias': AUTENTICADOS,
  'tatica:editar_propria': AUTENTICADOS,   // somente enquanto pendente
  'tatica:excluir_propria': AUTENTICADOS,  // somente enquanto pendente
  'tatica:moderar': [ADMIN],               // listar todas, aprovar, rejeitar, excluir qualquer

  'conquista:listar': TODOS,
  'conquista:marcar_progresso': AUTENTICADOS,

  'usuario:listar': [ADMIN],
  'usuario:alterar_perfil': [ADMIN],
});

/** Perfil efetivo de um usuário (null/undefined = visitante). */
export function perfilDe(usuario) {
  return usuario?.perfil ?? VISITANTE;
}

/** true se o perfil pode executar a ação. Ações desconhecidas são negadas. */
export function pode(perfil, acao) {
  const permitidos = MATRIZ_PERMISSOES[acao];
  return Array.isArray(permitidos) && permitidos.includes(perfil);
}
