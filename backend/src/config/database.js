/**
 * Conexão com o PostgreSQL (pool de conexões do driver `pg`).
 *
 * Esta é a única porta de entrada para o banco. As consultas são sempre
 * parametrizadas ($1, $2, ...): os valores viajam separados do texto SQL,
 * o que impede SQL Injection.
 */
import pg from 'pg';
import { config } from './env.js';

export function criarPool(opcoes = {}) {
  return new pg.Pool({
    host: config.banco.host,
    port: config.banco.porta,
    database: config.banco.nome,
    user: config.banco.usuario,
    password: config.banco.senha,
    max: config.banco.maxConexoes,
    ...opcoes,
  });
}

/**
 * Executa `fn` dentro de uma transação. Se `fn` lançar erro, tudo é
 * desfeito (ROLLBACK).
 */
export async function emTransacao(pool, fn) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}
