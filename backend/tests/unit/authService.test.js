import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarAuthService } from '../../src/services/authService.js';
import { criarLoggerFalso, erroDoTipo, hasherFalso } from './falsos.js';

function criarRepositorioEmMemoria() {
  const usuarios = [];
  return {
    usuarios,
    existeEmail: async (email) => usuarios.some((u) => u.email === email),
    buscarCredenciaisPorEmail: async (email) => usuarios.find((u) => u.email === email) ?? null,
    criar: async (dados) => {
      const usuario = { id: usuarios.length + 1, ...dados };
      usuarios.push(usuario);
      const { senhaHash, ...publico } = usuario;
      return publico;
    },
  };
}

describe('AuthService', () => {
  let repositorio;
  let logger;
  let servico;
  let comparacoes;

  beforeEach(() => {
    repositorio = criarRepositorioEmMemoria();
    logger = criarLoggerFalso();
    comparacoes = 0;
    const hasher = { ...hasherFalso, comparar: async (...args) => { comparacoes += 1; return hasherFalso.comparar(...args); } };
    servico = criarAuthService({ usuarioRepository: repositorio, hasher, logger });
  });

  it('registra usuário com perfil jogador e guarda apenas o hash da senha', async () => {
    const usuario = await servico.registrar({ nome: 'Cuphead', email: 'cup@head.com', senha: 'xicara123', perfil: 'admin' });
    assert.equal(usuario.perfil, 'jogador');
    assert.equal(repositorio.usuarios[0].senhaHash, 'hash:xicara123');
    assert.equal('senha' in repositorio.usuarios[0], false);
    assert.equal(logger.eventos('entidade.criada').length, 1);
  });

  it('recusa e-mail já cadastrado com 409', async () => {
    await servico.registrar({ nome: 'Cuphead', email: 'cup@head.com', senha: 'xicara123' });
    await assert.rejects(
      servico.registrar({ nome: 'Outro', email: 'CUP@head.com', senha: 'xicara123' }),
      erroDoTipo(409, 'CONFLITO'),
    );
  });

  it('autentica com credenciais corretas e registra login_sucesso', async () => {
    await servico.registrar({ nome: 'Cuphead', email: 'cup@head.com', senha: 'xicara123' });
    const usuario = await servico.autenticar({ email: 'cup@head.com', senha: 'xicara123' }, { ip: '127.0.0.1' });
    assert.equal(usuario.email, 'cup@head.com');
    assert.equal('senhaHash' in usuario, false);
    assert.equal(logger.eventos('auth.login_sucesso').length, 1);
  });

  it('recusa senha incorreta com 401 genérico e registra login_falha', async () => {
    await servico.registrar({ nome: 'Cuphead', email: 'cup@head.com', senha: 'xicara123' });
    await assert.rejects(servico.autenticar({ email: 'cup@head.com', senha: 'errada123' }), erroDoTipo(401, 'CREDENCIAIS_INVALIDAS'));
    assert.equal(logger.eventos('auth.login_falha')[0].motivo, 'senha_incorreta');
  });

  it('e-mail inexistente recebe a mesma resposta e ainda executa a comparação de hash', async () => {
    await assert.rejects(servico.autenticar({ email: 'ninguem@x.com', senha: 'qualquer1' }), erroDoTipo(401, 'CREDENCIAIS_INVALIDAS'));
    assert.equal(comparacoes, 1);
    assert.equal(logger.eventos('auth.login_falha')[0].motivo, 'usuario_inexistente');
  });

  it('rejeita login com tipos inválidos antes de consultar o banco', async () => {
    await assert.rejects(servico.autenticar({ email: { $ne: null }, senha: ['x'] }), erroDoTipo(422, 'VALIDACAO'));
    assert.equal(comparacoes, 0);
  });
});
