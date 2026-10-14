/**
 * Dublês de teste (fakes) usados nos testes unitários dos services.
 * Permitem testar a lógica de negócio sem banco de dados.
 */
export function criarLoggerFalso() {
  const registros = [];
  const registrar = (nivel) => (evento, dados = {}) => registros.push({ nivel, evento, ...dados });
  return {
    registros,
    debug: registrar('debug'),
    info: registrar('info'),
    aviso: registrar('aviso'),
    erro: registrar('erro'),
    eventos: (nome) => registros.filter((r) => r.evento === nome),
  };
}

/** Hasher determinístico e instantâneo (o bcrypt real é testado na integração). */
export const hasherFalso = {
  gerar: async (senha) => `hash:${senha}`,
  comparar: async (senha, hash) => hash === `hash:${senha}`,
};

/** Verifica se uma promise rejeitou com AppError de status/código esperados. */
export function erroDoTipo(status, codigo) {
  return (erro) => erro.status === status && (!codigo || erro.codigo === codigo);
}
