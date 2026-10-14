/**
 * Cria (ou promove) a conta de administrador.
 *
 * As credenciais NÃO ficam no código: são lidas de ADMIN_NOME, ADMIN_EMAIL
 * e ADMIN_SENHA no arquivo .env. Uso:  npm run criar-admin
 */
import { config } from '../src/config/env.js';
import { criarPool } from '../src/config/database.js';
import { criarUsuarioRepository } from '../src/repositories/usuarioRepository.js';
import { criarHasherBcrypt } from '../src/services/hasher.js';
import { validar } from '../src/utils/validacao.js';
import { esquemaRegistro } from '../src/validators/authEsquemas.js';

const pool = criarPool();
try {
  const { nome, email, senha } = validar(
    { nome: process.env.ADMIN_NOME, email: process.env.ADMIN_EMAIL, senha: process.env.ADMIN_SENHA },
    esquemaRegistro,
  );
  const senhaHash = await criarHasherBcrypt(config.seguranca.custoBcrypt).gerar(senha);
  const admin = await criarUsuarioRepository(pool).salvarAdministrador({ nome, email, senhaHash });
  console.log(`Administrador pronto: ${admin.email} (id ${admin.id})`);
} catch (erro) {
  console.error('Não foi possível criar o administrador:', erro.detalhes ?? erro.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
