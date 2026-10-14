/**
 * Testes de segurança automatizados (evidências do item 6 do enunciado).
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { config } from '../../src/config/env.js';
import { criarApp } from '../../src/app.js';
import { criarLoggerFalso } from '../unit/falsos.js';
import { ADMIN, JOGADOR, cadastrar, entrarComo, novoAgente, prepararAmbiente } from './ambiente.js';

describe('Segurança', () => {
  let ambiente;
  let jogador;

  before(async () => {
    ambiente = await prepararAmbiente();
    await cadastrar(ambiente.app, JOGADOR);
    jogador = await entrarComo(ambiente.app, JOGADOR);
  });
  after(() => ambiente.encerrar());

  it('[SQLi] login com payload de injeção é rejeitado e não autentica', async () => {
    const agente = await novoAgente(ambiente.app);
    const resposta = await agente.post('/api/auth/login').set('X-CSRF-Token', agente.csrf)
      .send({ email: "admin@teste.local' OR '1'='1' --", senha: 'x' });
    assert.ok([401, 422].includes(resposta.status));
    assert.equal(resposta.body.dados, undefined);
  });

  it('[SQLi] busca com payload é tratada como texto e o banco permanece íntegro', async () => {
    const payload = "'; DROP TABLE chefes; --";
    const resposta = await request(ambiente.app).get(`/api/chefes?busca=${encodeURIComponent(payload)}`).expect(200);
    assert.deepEqual(resposta.body.dados, []);
    const { rows } = await ambiente.pool.query('SELECT count(*)::int AS total FROM chefes');
    assert.equal(rows[0].total, 19);
  });

  it('[SQLi] parâmetro de rota "1 OR 1=1" é recusado pela validação', async () => {
    await request(ambiente.app).get('/api/chefes/1%20OR%201=1').expect(422);
  });

  it('[XSS] conteúdo com <script> é devolvido apenas como JSON, com CSP e nosniff', async () => {
    const payload = '<script>alert("xss")</script> fique no canto';
    const criada = await jogador.post('/api/taticas').set('X-CSRF-Token', jogador.csrf)
      .send({ chefeId: 1, conteudo: payload }).expect(201);
    assert.equal(criada.headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(criada.headers['x-content-type-options'], 'nosniff');

    const refletido = await request(ambiente.app).get(`/api/chefes?busca=${encodeURIComponent('<img src=x onerror=alert(1)>')}`);
    assert.match(refletido.headers['content-type'], /application\/json/);

    const pagina = await request(ambiente.app).get('/index.html').expect(200);
    assert.match(pagina.headers['content-security-policy'], /script-src 'self'/);
  });

  it('[CSRF] requisição sem token ou com token errado é bloqueada (403)', async () => {
    const semToken = await jogador.post('/api/taticas').send({ chefeId: 1, conteudo: 'Tentativa sem token CSRF.' }).expect(403);
    assert.equal(semToken.body.erro.codigo, 'CSRF_INVALIDO');
    await jogador.post('/api/taticas').set('X-CSRF-Token', 'token-forjado').send({ chefeId: 1, conteudo: 'Token forjado aqui.' }).expect(403);
  });

  it('[Acesso sem login] rotas protegidas retornam 401', async () => {
    const visitante = await novoAgente(ambiente.app);
    await visitante.get('/api/taticas/minhas').expect(401);
    await visitante.get('/api/conquistas/progresso').expect(401);
    const resposta = await visitante.post('/api/taticas').set('X-CSRF-Token', visitante.csrf)
      .send({ chefeId: 1, conteudo: 'Visitante tentando enviar.' }).expect(401);
    assert.equal(resposta.body.erro.codigo, 'NAO_AUTENTICADO');
  });

  it('[Perfil insuficiente] jogador não acessa rotas de administrador (403)', async () => {
    await jogador.post('/api/chefes').set('X-CSRF-Token', jogador.csrf)
      .send({ nome: 'Hacker', fase: 'Invasão', ilhaId: 1, estrategia: 'Tentando criar chefe sem permissão.', dificuldade: 1 })
      .expect(403);
    await jogador.delete('/api/chefes/1').set('X-CSRF-Token', jogador.csrf).expect(403);
    await jogador.get('/api/usuarios').expect(403);
    await jogador.patch('/api/taticas/1/status').set('X-CSRF-Token', jogador.csrf).send({ status: 'aprovada' }).expect(403);
    assert.ok(ambiente.logger.eventos('acesso.negado').length >= 4);
  });

  it('[Sessão inválida] cookie reutilizado após logout não dá acesso (401)', async () => {
    const agente = await entrarComo(ambiente.app, ADMIN);
    await agente.get('/api/usuarios').expect(200);
    const cookieAntigo = agente.jar.getCookies({ path: '/', domain: '127.0.0.1', secure: false, script: false })
      .map((c) => c.toValueString()).join('; ');
    assert.match(cookieAntigo, /cuphead\.sid=/);

    await agente.post('/api/auth/logout').set('X-CSRF-Token', agente.csrf).expect(204);
    await request(ambiente.app).get('/api/usuarios').set('Cookie', cookieAntigo).expect(401);
  });

  it('[Mass assignment] cadastro com "perfil": "admin" cria apenas jogador', async () => {
    const agente = await novoAgente(ambiente.app);
    const resposta = await agente.post('/api/auth/registro').set('X-CSRF-Token', agente.csrf)
      .send({ nome: 'Espertinho', email: 'esperto@teste.local', senha: 'senha12345', perfil: 'admin' }).expect(201);
    assert.equal(resposta.body.dados.perfil, 'jogador');
  });

  it('[Senhas] banco armazena apenas hash bcrypt, nunca a senha', async () => {
    const { rows } = await ambiente.pool.query('SELECT senha_hash FROM usuarios WHERE email = $1', [JOGADOR.email]);
    assert.match(rows[0].senha_hash, /^\$2[aby]\$\d{2}\$.{53}$/);
    assert.notEqual(rows[0].senha_hash, JOGADOR.senha);
  });

  it('[Respostas] nenhuma resposta da API expõe senha_hash', async () => {
    const resposta = await entrarComo(ambiente.app, ADMIN).then((a) => a.get('/api/usuarios'));
    assert.doesNotMatch(JSON.stringify(resposta.body), /senha/i);
  });
});

describe('Segurança - rate limiting do login', () => {
  let ambiente;
  before(async () => { ambiente = await prepararAmbiente({ seguranca: { limiteLoginPorJanela: 3 } }); });
  after(() => ambiente.encerrar());

  it('bloqueia com 429 após 3 tentativas erradas', async () => {
    const agente = await novoAgente(ambiente.app);
    for (let i = 0; i < 3; i += 1) {
      await agente.post('/api/auth/login').set('X-CSRF-Token', agente.csrf).send({ email: ADMIN.email, senha: 'errada123' }).expect(401);
    }
    const bloqueado = await agente.post('/api/auth/login').set('X-CSRF-Token', agente.csrf).send({ email: ADMIN.email, senha: ADMIN.senha }).expect(429);
    assert.equal(bloqueado.body.erro.codigo, 'MUITAS_REQUISICOES');
    assert.equal(ambiente.logger.eventos('auth.login_falha').length, 3);
  });
});

describe('Tratamento de erros - detalhes técnicos só em desenvolvimento', () => {
  const poolQuebrado = { query: async () => { throw new Error('conexão recusada (simulada)'); } };

  it('em produção o erro interno não expõe stack trace', async () => {
    const logger = criarLoggerFalso();
    const app = criarApp({ pool: poolQuebrado, config: { ...config, emDesenvolvimento: false }, logger });

    const resposta = await request(app).get('/api/saude').expect(500);
    assert.equal(resposta.body.erro.codigo, 'ERRO_INTERNO');
    assert.equal(resposta.body.erro.tecnico, undefined);
    assert.equal(logger.eventos('erro.interno')[0].mensagem, 'conexão recusada (simulada)');
  });

  it('em desenvolvimento o erro inclui o bloco "tecnico"', async () => {
    const app = criarApp({ pool: poolQuebrado, config: { ...config, emDesenvolvimento: true }, logger: criarLoggerFalso() });

    const resposta = await request(app).get('/api/saude').expect(500);
    assert.equal(resposta.body.erro.tecnico.mensagem, 'conexão recusada (simulada)');
    assert.ok(Array.isArray(resposta.body.erro.tecnico.stack));
  });
});
