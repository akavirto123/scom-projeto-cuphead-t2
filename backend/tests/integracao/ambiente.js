/**
 * Ambiente dos testes de integração: banco de testes recriado do zero
 * (mesmas migrações da aplicação), app Express real e agentes HTTP
 * (supertest) que guardam cookies como um navegador.
 */
import assert from 'node:assert/strict';
import request from 'supertest';
import { config } from '../../src/config/env.js';
import { criarPool } from '../../src/config/database.js';
import { criarApp } from '../../src/app.js';
import { executarMigracoes } from '../../database/migracoes.js';
import { criarHasherBcrypt } from '../../src/services/hasher.js';
import { criarUsuarioRepository } from '../../src/repositories/usuarioRepository.js';
import { criarLoggerFalso } from '../unit/falsos.js';

export const ADMIN = { nome: 'Admin Teste', email: 'admin@teste.local', senha: 'senhaAdmin123' };
export const JOGADOR = { nome: 'Cuphead', email: 'cuphead@teste.local', senha: 'xicara123' };

export async function prepararAmbiente({ seguranca = {}, emDesenvolvimento = false } = {}) {
  const pool = criarPool();
  await executarMigracoes(pool, { resetar: true });

  const configTeste = {
    ...config,
    emDesenvolvimento,
    seguranca: { ...config.seguranca, custoBcrypt: 4, limiteLoginPorJanela: 100, ...seguranca },
  };
  const logger = criarLoggerFalso();
  const app = criarApp({ pool, config: configTeste, logger });

  const senhaHash = await criarHasherBcrypt(4).gerar(ADMIN.senha);
  await criarUsuarioRepository(pool).salvarAdministrador({ ...ADMIN, senhaHash });

  return { app, pool, logger, encerrar: () => pool.end() };
}

/** Agente "visitante" já com token CSRF da sessão. */
export async function novoAgente(app) {
  const agente = request.agent(app);
  const resposta = await agente.get('/api/auth/sessao').expect(200);
  agente.csrf = resposta.body.dados.csrfToken;
  return agente;
}

export async function cadastrar(app, usuario) {
  const agente = await novoAgente(app);
  await agente.post('/api/auth/registro').set('X-CSRF-Token', agente.csrf).send(usuario).expect(201);
}

export async function entrarComo(app, { email, senha }) {
  const agente = await novoAgente(app);
  const resposta = await agente.post('/api/auth/login').set('X-CSRF-Token', agente.csrf).send({ email, senha });
  assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
  agente.csrf = resposta.body.dados.csrfToken;
  return agente;
}
