/**
 * Medição de desempenho da API com autocannon.
 *
 * Sobe a aplicação em uma porta livre (usando o banco de desenvolvimento),
 * dispara carga contra os endpoints de leitura mais usados e mede também
 * o custo do hash bcrypt usado no login.
 *
 *   npm run bench            (10 s por endpoint, 10 conexões)
 *   npm run bench -- 5 20    (5 s por endpoint, 20 conexões)
 */
import { performance } from 'node:perf_hooks';
import autocannon from 'autocannon';
import { config } from '../src/config/env.js';
import { criarPool } from '../src/config/database.js';
import { criarApp } from '../src/app.js';
import { criarHasherBcrypt } from '../src/services/hasher.js';

const duracao = Number(process.argv[2] ?? 10);
const conexoes = Number(process.argv[3] ?? 10);
const ENDPOINTS = [
  '/api/chefes',
  '/api/chefes?ilha=2&busca=the&limite=10',
  '/api/chefes/1',
  '/api/chefes/1/taticas',
  '/api/conquistas',
];

// O rate limit da API é elevado só neste processo de medição.
const configBench = { ...config, seguranca: { ...config.seguranca, limiteApiPorMinuto: 10_000_000 } };
const pool = criarPool({ max: conexoes });
const servidor = criarApp({ pool, config: configBench }).listen(0);
const base = `http://127.0.0.1:${servidor.address().port}`;

console.log(`Ambiente: Node ${process.version}, ${conexoes} conexões, ${duracao}s por endpoint\n`);
console.log('| Endpoint | Req/s (média) | Latência média (ms) | p50 (ms) | p99 (ms) | Erros/não-2xx |');
console.log('|---|---:|---:|---:|---:|---:|');

for (const caminho of ENDPOINTS) {
  const r = await autocannon({ url: base + caminho, connections: conexoes, duration: duracao });
  console.log(`| \`GET ${caminho}\` | ${r.requests.average.toFixed(0)} | ${r.latency.average.toFixed(2)} | ${r.latency.p50} | ${r.latency.p99} | ${r.errors + r.non2xx} |`);
}

const hasher = criarHasherBcrypt(config.seguranca.custoBcrypt);
const inicio = performance.now();
const hash = await hasher.gerar('senhaDeTeste123');
const tempoHash = performance.now() - inicio;
const inicioCmp = performance.now();
await hasher.comparar('senhaDeTeste123', hash);
const tempoCmp = performance.now() - inicioCmp;
console.log(`\nbcrypt (custo ${config.seguranca.custoBcrypt}): gerar hash ${tempoHash.toFixed(0)} ms, verificar ${tempoCmp.toFixed(0)} ms por login`);

servidor.close();
await pool.end();
