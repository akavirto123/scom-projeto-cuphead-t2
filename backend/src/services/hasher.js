/**
 * Hash de senhas com bcrypt (salt aleatório embutido no hash, custo
 * configurável por BCRYPT_COST). Isolado em um módulo para que os testes
 * unitários possam injetar uma implementação rápida.
 */
import bcrypt from 'bcryptjs';

export function criarHasherBcrypt(custo) {
  return {
    gerar: (senha) => bcrypt.hash(senha, custo),
    comparar: (senha, hash) => bcrypt.compare(senha, hash),
  };
}
