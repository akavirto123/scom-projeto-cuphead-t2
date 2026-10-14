import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MATRIZ_PERMISSOES, PERFIS, perfilDe, pode } from '../../src/domain/permissoes.js';

describe('Matriz de permissões (RBAC)', () => {
  it('visitante só tem permissões de leitura pública', () => {
    const permitidas = Object.keys(MATRIZ_PERMISSOES).filter((acao) => pode(PERFIS.VISITANTE, acao));
    assert.deepEqual(permitidas, ['chefe:listar', 'tatica:listar_aprovadas', 'conquista:listar']);
  });

  it('jogador pode sugerir táticas e marcar conquistas, mas não gerenciar chefes', () => {
    assert.equal(pode(PERFIS.JOGADOR, 'tatica:criar'), true);
    assert.equal(pode(PERFIS.JOGADOR, 'conquista:marcar_progresso'), true);
    assert.equal(pode(PERFIS.JOGADOR, 'chefe:criar'), false);
    assert.equal(pode(PERFIS.JOGADOR, 'tatica:moderar'), false);
  });

  it('administrador tem todas as permissões', () => {
    for (const acao of Object.keys(MATRIZ_PERMISSOES)) assert.equal(pode(PERFIS.ADMIN, acao), true, acao);
  });

  it('nega ações desconhecidas e perfis inexistentes', () => {
    assert.equal(pode(PERFIS.ADMIN, 'chefe:apagar_tudo'), false);
    assert.equal(pode('superusuario', 'chefe:listar'), false);
  });

  it('trata ausência de usuário como visitante', () => {
    assert.equal(perfilDe(null), PERFIS.VISITANTE);
    assert.equal(perfilDe({ perfil: 'admin' }), PERFIS.ADMIN);
  });
});
