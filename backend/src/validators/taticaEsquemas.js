/** Esquemas de validação de táticas da comunidade. */
export const STATUS_TATICA = Object.freeze(['pendente', 'aprovada', 'rejeitada']);

export const esquemaNovaTatica = {
  chefeId: { tipo: 'inteiro', obrigatorio: true, min: 1, max: 2147483647 },
  conteudo: { tipo: 'texto', obrigatorio: true, min: 10, max: 1000, multilinha: true },
};

export const esquemaEditarTatica = {
  conteudo: esquemaNovaTatica.conteudo,
};

export const esquemaModerarTatica = {
  status: { tipo: 'opcao', obrigatorio: true, opcoes: ['aprovada', 'rejeitada'] },
};

export const esquemaFiltroTaticas = {
  status: { tipo: 'opcao', opcoes: STATUS_TATICA },
};
