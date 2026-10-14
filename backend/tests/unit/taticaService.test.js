import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarTaticaService } from '../../src/services/taticaService.js';
import { criarLoggerFalso, erroDoTipo } from './falsos.js';

const AUTOR = { id: 10, perfil: 'jogador' };
const OUTRO = { id: 11, perfil: 'jogador' };
const ADMIN = { id: 1, perfil: 'admin' };

function montar(taticaExistente) {
  const excluidas = [];
  const servico = criarTaticaService({
    logger: criarLoggerFalso(),
    chefeRepository: { existe: async (id) => id === 1 },
    taticaRepository: {
      buscarPorId: async (id) => (id === taticaExistente?.id ? { ...taticaExistente } : null),
      criar: async (dados) => ({ id: 5, status: 'pendente', ...dados }),
      atualizarConteudo: async (id, conteudo) => ({ ...taticaExistente, conteudo }),
      moderar: async (id, { status }) => ({ ...taticaExistente, status }),
      excluir: async (id) => { excluidas.push(id); return true; },
    },
  });
  return { servico, excluidas };
}

const pendente = { id: 7, usuarioId: AUTOR.id, status: 'pendente', conteudo: 'Original com mais de dez letras' };
const aprovada = { ...pendente, status: 'aprovada' };

describe('TaticaService', () => {
  it('cria tática como pendente vinculada ao usuário', async () => {
    const { servico } = montar();
    const tatica = await servico.criar({ chefeId: 1, conteudo: 'Use o Smoke Dash no salto.' }, AUTOR);
    assert.equal(tatica.status, 'pendente');
    assert.equal(tatica.usuarioId, AUTOR.id);
  });

  it('recusa tática para chefe inexistente', async () => {
    const { servico } = montar();
    await assert.rejects(servico.criar({ chefeId: 999, conteudo: 'Tática qualquer aqui.' }, AUTOR), erroDoTipo(422));
  });

  it('autor edita a própria tática pendente', async () => {
    const { servico } = montar(pendente);
    const editada = await servico.editar('7', { conteudo: 'Conteúdo revisado pelo autor.' }, AUTOR);
    assert.equal(editada.conteudo, 'Conteúdo revisado pelo autor.');
  });

  it('impede que outro jogador edite ou exclua a tática (403)', async () => {
    const { servico } = montar(pendente);
    await assert.rejects(servico.editar('7', { conteudo: 'Tentativa de alteração.' }, OUTRO), erroDoTipo(403, 'ACESSO_NEGADO'));
    await assert.rejects(servico.excluir('7', OUTRO), erroDoTipo(403, 'ACESSO_NEGADO'));
  });

  it('impede que o autor altere tática já moderada (409)', async () => {
    const { servico } = montar(aprovada);
    await assert.rejects(servico.editar('7', { conteudo: 'Mudando depois de aprovada.' }, AUTOR), erroDoTipo(409, 'CONFLITO'));
  });

  it('administrador exclui qualquer tática, mesmo aprovada', async () => {
    const { servico, excluidas } = montar(aprovada);
    await servico.excluir('7', ADMIN);
    assert.deepEqual(excluidas, [7]);
  });

  it('moderação aceita apenas "aprovada" ou "rejeitada"', async () => {
    const { servico } = montar(pendente);
    assert.equal((await servico.moderar('7', { status: 'aprovada' }, ADMIN)).status, 'aprovada');
    await assert.rejects(servico.moderar('7', { status: 'pendente' }, ADMIN), erroDoTipo(422, 'VALIDACAO'));
  });
});
