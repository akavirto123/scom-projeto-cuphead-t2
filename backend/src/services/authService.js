/**
 * Regras de negócio de cadastro e autenticação.
 */
import { AppError } from '../utils/AppError.js';
import { validar } from '../utils/validacao.js';
import { esquemaLogin, esquemaRegistro } from '../validators/authEsquemas.js';

export function criarAuthService({ usuarioRepository, hasher, logger }) {
  // Hash de uma senha qualquer, usado quando o e-mail não existe: assim o
  // login demora o mesmo tempo nos dois casos e um atacante não descobre
  // quais e-mails estão cadastrados medindo o tempo de resposta.
  let hashFicticio;
  const obterHashFicticio = async () => (hashFicticio ??= await hasher.gerar('senha-ficticia-tempo-constante-0'));

  return {
    async registrar(dados) {
      const { nome, email, senha } = validar(dados, esquemaRegistro);

      if (await usuarioRepository.existeEmail(email)) {
        throw AppError.conflito('Já existe uma conta com este e-mail.');
      }

      const senhaHash = await hasher.gerar(senha);
      const usuario = await usuarioRepository.criar({ nome, email, senhaHash, perfil: 'jogador' });
      logger.info('entidade.criada', { entidade: 'usuario', id: usuario.id, perfil: usuario.perfil });
      return usuario;
    },

    async autenticar(dados, contexto = {}) {
      const { email, senha } = validar(dados, esquemaLogin);
      const registro = await usuarioRepository.buscarCredenciaisPorEmail(email);
      const senhaConfere = await hasher.comparar(senha, registro?.senhaHash ?? (await obterHashFicticio()));

      if (!registro || !senhaConfere) {
        logger.aviso('auth.login_falha', {
          email,
          ip: contexto.ip,
          motivo: registro ? 'senha_incorreta' : 'usuario_inexistente',
        });
        throw new AppError(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.');
      }

      const { senhaHash, ...usuario } = registro;
      logger.info('auth.login_sucesso', { usuarioId: usuario.id, perfil: usuario.perfil, ip: contexto.ip });
      return usuario;
    },
  };
}
