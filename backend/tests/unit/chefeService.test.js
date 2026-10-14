import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarChefeService } from '../../src/services/chefeService.js';
import { escaparLike } from '../../src/repositories/chefeRepository.js';
import { criarLoggerFalso, erroDoTipo } from './falsos.js';

const ADMIN = { id: 1, perfil: 'admin' };
const CHEFE_VALIDO = {
  nome: 'Glumstone the Giant',
  fase: 'Doggone Dogfight',
  ilhaId: 4,
  estrategia: 'Fique longe das mãos do gigante e atire nos olhos.',
  dificuldade: 4,
};

function montar({ nomesExistentes = [] } = {}) {
  const criados = [];
  const logger = criarLoggerFalso();
  const servico = criarChefeService({
    logger,
    ilhaRepository: { existe: async (id) => [1, 2, 3, 4].includes(id) },
    chefeRepository: {
      existeNome: async (nome) => nomesExistentes.includes(nome.toLowerCase()),
      existe: async (id) => id === 1,
      buscarPorId: async (id) => (id === 1 ? { id: 1, nome: 'The Root Pack' } : null),
      criar: async (dados) => { criados.push(dados); return { id: 99, ...dados }; },
      listar: async (filtros) => ({ itens: [], total: 0, filtros }),
    },
  });
  return { servico, criados, logger };
}

describe('ChefeService', () => {
  it('cria chefe válido, registra o autor e loga a criação', async () => {
    const { servico, criados, logger } = montar();
    const chefe = await servico.criar(CHEFE_VALIDO, ADMIN);
    assert.equal(chefe.id, 99);
    assert.equal(criados[0].criadoPor, ADMIN.id);
    assert.deepEqual(logger.eventos('entidade.criada')[0], { nivel: 'info', evento: 'entidade.criada', entidade: 'chefe', id: 99, por: 1 });
  });

  it('recusa ilha inexistente com 422', async () => {
    const { servico } = montar();
    await assert.rejects(servico.criar({ ...CHEFE_VALIDO, ilhaId: 77 }, ADMIN), (erro) => erro.status === 422 && erro.detalhes[0].campo === 'ilhaId');
  });

  it('recusa nome duplicado com 409', async () => {
    const { servico } = montar({ nomesExistentes: ['glumstone the giant'] });
    await assert.rejects(servico.criar(CHEFE_VALIDO, ADMIN), erroDoTipo(409, 'CONFLITO'));
  });

  it('recusa estratégia curta e dificuldade fora de 1-5', async () => {
    const { servico } = montar();
    await assert.rejects(
      servico.criar({ ...CHEFE_VALIDO, estrategia: 'curta', dificuldade: 0 }, ADMIN),
      (erro) => erro.status === 422 && erro.detalhes.length === 2,
    );
  });

  it('retorna 404 para chefe inexistente', async () => {
    const { servico } = montar();
    await assert.rejects(servico.obter('555'), erroDoTipo(404, 'NAO_ENCONTRADO'));
  });

  it('calcula a paginação e repassa filtros ao repositório', async () => {
    const { servico } = montar();
    const resultado = await servico.listar({ pagina: '2', limite: '6', ilha: '3', busca: ' devil ' });
    assert.deepEqual(resultado.filtros, { ilhaId: 3, busca: 'devil', pagina: 2, limite: 6, deslocamento: 6 });
  });

  it('escapa curingas do LIKE na busca', () => {
    assert.equal(escaparLike('100%_ok\\'), '100\\%\\_ok\\\\');
  });
});
