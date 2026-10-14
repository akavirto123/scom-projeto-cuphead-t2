/**
 * Logger de aplicação (observabilidade básica).
 *
 * Cada registro é uma linha JSON com timestamp ISO-8601, nível, nome do
 * evento e dados de contexto. As linhas vão para o arquivo configurado
 * em LOG_FILE e, fora do ambiente de testes, também para o console.
 *
 * Regra: nunca registrar senhas, hashes, tokens ou cookies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './env.js';

const NIVEIS = Object.freeze({ debug: 10, info: 20, aviso: 30, erro: 40 });
const CAMPOS_PROIBIDOS = new Set(['senha', 'senha_hash', 'senhaHash', 'token', 'csrfToken', 'cookie']);

fs.mkdirSync(path.dirname(config.log.arquivo), { recursive: true });
const destino = fs.createWriteStream(config.log.arquivo, { flags: 'a' });

function limpar(dados) {
  const seguro = {};
  for (const [chave, valor] of Object.entries(dados)) {
    if (!CAMPOS_PROIBIDOS.has(chave)) seguro[chave] = valor;
  }
  return seguro;
}

function registrar(nivel, evento, dados = {}) {
  if (NIVEIS[nivel] < (NIVEIS[config.log.nivel] ?? NIVEIS.info)) return;

  const entrada = { timestamp: new Date().toISOString(), nivel, evento, ...limpar(dados) };
  const linha = JSON.stringify(entrada);
  destino.write(linha + '\n');

  if (!config.emTeste) {
    const saida = nivel === 'erro' ? console.error : console.log;
    saida(linha);
  }
}

export const logger = Object.freeze({
  debug: (evento, dados) => registrar('debug', evento, dados),
  info: (evento, dados) => registrar('info', evento, dados),
  aviso: (evento, dados) => registrar('aviso', evento, dados),
  erro: (evento, dados) => registrar('erro', evento, dados),
});

/** Fecha o arquivo de log (usado ao encerrar o servidor e nos testes). */
export function encerrarLogger() {
  return new Promise((resolve) => destino.end(resolve));
}
