/** Esquemas de validação do cadastro, login e perfis de usuário. */
export const esquemaRegistro = {
  nome: { tipo: 'texto', obrigatorio: true, min: 2, max: 60 },
  email: { tipo: 'email', obrigatorio: true },
  senha: { tipo: 'senha', obrigatorio: true, forte: true },
};

export const esquemaLogin = {
  email: { tipo: 'email', obrigatorio: true },
  senha: { tipo: 'senha', obrigatorio: true },
};

export const esquemaAlterarPerfil = {
  perfil: { tipo: 'opcao', obrigatorio: true, opcoes: ['jogador', 'admin'] },
};
