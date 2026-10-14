/** Esquemas de validação de chefes. */
export const esquemaChefe = {
  nome: { tipo: 'texto', obrigatorio: true, min: 2, max: 60 },
  fase: { tipo: 'texto', obrigatorio: true, min: 2, max: 80 },
  ilhaId: { tipo: 'inteiro', obrigatorio: true, min: 1, max: 32767 },
  estrategia: { tipo: 'texto', obrigatorio: true, min: 20, max: 1000, multilinha: true },
  dificuldade: { tipo: 'inteiro', obrigatorio: true, min: 1, max: 5 },
};

export const esquemaFiltroChefes = {
  ilha: { tipo: 'inteiro', min: 1, max: 32767 },
  busca: { tipo: 'texto', min: 1, max: 60 },
};
