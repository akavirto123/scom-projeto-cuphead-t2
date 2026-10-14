/**
 * Testes de integração da API: requisições HTTP reais contra o Express
 * e o PostgreSQL de testes.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { ADMIN, JOGADOR, cadastrar, entrarComo, prepararAmbiente } from './ambiente.js';

describe('API - fluxos principais', () => {
  let ambiente;
  let admin;
  let jogador;

  before(async () => {
    ambiente = await prepararAmbiente();
    await cadastrar(ambiente.app, JOGADOR);
    admin = await entrarComo(ambiente.app, ADMIN);
    jogador = await entrarComo(ambiente.app, JOGADOR);
  });
  after(() => ambiente.encerrar());

  it('GET /api/chefes lista com paginação e filtro (público)', async () => {
    const resposta = await request(ambiente.app).get('/api/chefes?ilha=1&limite=2').expect(200);
    assert.equal(resposta.body.dados.length, 2);
    assert.deepEqual(resposta.body.paginacao, { pagina: 1, limite: 2, total: 5, totalPaginas: 3 });
    assert.equal(resposta.body.dados[0].nome, 'The Root Pack');
  });

  it('GET /api/chefes?busca encontra pelo nome sem diferenciar maiúsculas', async () => {
    const resposta = await request(ambiente.app).get('/api/chefes?busca=DEVIL').expect(200);
    assert.deepEqual(resposta.body.dados.map((c) => c.nome), ['The Devil']);
  });

  it('CRUD completo de chefe pelo administrador', async () => {
    const novo = { nome: 'Glumstone the Giant', fase: 'Doggone Dogfight', ilhaId: 4, estrategia: 'Atire nos olhos e evite as mãos.', dificuldade: 4 };
    const criado = await admin.post('/api/chefes').set('X-CSRF-Token', admin.csrf).send(novo).expect(201);
    const id = criado.body.dados.id;
    assert.equal(criado.headers.location, `/api/chefes/${id}`);

    const atualizado = await admin.put(`/api/chefes/${id}`).set('X-CSRF-Token', admin.csrf).send({ ...novo, dificuldade: 3 }).expect(200);
    assert.equal(atualizado.body.dados.dificuldade, 3);

    await admin.delete(`/api/chefes/${id}`).set('X-CSRF-Token', admin.csrf).expect(204);
    await request(ambiente.app).get(`/api/chefes/${id}`).expect(404);
  });

  it('fluxo de tática: jogador envia, admin aprova, guia público exibe', async () => {
    const enviada = await jogador.post('/api/taticas').set('X-CSRF-Token', jogador.csrf)
      .send({ chefeId: 1, conteudo: 'Fique no canto durante a fase da cenoura.' }).expect(201);
    assert.equal(enviada.body.dados.status, 'pendente');

    let publicas = await request(ambiente.app).get('/api/chefes/1/taticas').expect(200);
    assert.equal(publicas.body.dados.length, 0, 'pendente não deve aparecer');

    await admin.patch(`/api/taticas/${enviada.body.dados.id}/status`).set('X-CSRF-Token', admin.csrf)
      .send({ status: 'aprovada' }).expect(200);

    publicas = await request(ambiente.app).get('/api/chefes/1/taticas').expect(200);
    assert.equal(publicas.body.dados[0].autorNome, JOGADOR.nome);
  });

  it('progresso de conquistas é salvo por usuário', async () => {
    await jogador.put('/api/conquistas/1/progresso').set('X-CSRF-Token', jogador.csrf).expect(204);
    await jogador.put('/api/conquistas/2/progresso').set('X-CSRF-Token', jogador.csrf).expect(204);
    await jogador.delete('/api/conquistas/2/progresso').set('X-CSRF-Token', jogador.csrf).expect(204);
    const resposta = await jogador.get('/api/conquistas/progresso').expect(200);
    assert.equal(resposta.body.dados.concluidas, 1);
    assert.equal(resposta.body.dados.total, 28);

    const doAdmin = await admin.get('/api/conquistas/progresso').expect(200);
    assert.equal(doAdmin.body.dados.concluidas, 0);
  });

  it('respostas de erro seguem o formato padronizado', async () => {
    const resposta = await admin.post('/api/chefes').set('X-CSRF-Token', admin.csrf)
      .send({ nome: '', dificuldade: 'muito' }).expect(422);
    assert.equal(resposta.headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(resposta.body.erro.status, 422);
    assert.equal(resposta.body.erro.codigo, 'VALIDACAO');
    assert.ok(resposta.body.erro.mensagem);
    assert.ok(resposta.body.erro.requisicaoId);
    assert.ok(resposta.body.erro.detalhes.some((d) => d.campo === 'dificuldade'));
  });

  it('JSON malformado retorna 400 e rota inexistente retorna 404', async () => {
    const malformado = await admin.post('/api/chefes').set('X-CSRF-Token', admin.csrf)
      .set('Content-Type', 'application/json').send('{"nome": ').expect(400);
    assert.equal(malformado.body.erro.codigo, 'JSON_INVALIDO');
    const inexistente = await request(ambiente.app).get('/api/nao-existe').expect(404);
    assert.equal(inexistente.body.erro.codigo, 'ROTA_NAO_ENCONTRADA');
  });

  it('eventos de login e de criação de entidade são registrados no log', async () => {
    const eventos = ambiente.logger.registros.map((r) => r.evento);
    assert.ok(eventos.includes('auth.login_sucesso'));
    assert.ok(eventos.includes('entidade.criada'));
  });
});
