/**
 * Configuração central da aplicação.
 *
 * Todos os valores vêm de variáveis de ambiente (arquivo .env em
 * desenvolvimento). Nenhuma credencial fica no código-fonte: se uma
 * variável obrigatória faltar, a aplicação se recusa a iniciar.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const RAIZ_BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

dotenv.config({ path: path.join(RAIZ_BACKEND, '.env'), quiet: true });

function obrigatoria(nome) {
  const valor = process.env[nome];
  if (valor === undefined || valor === '') {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome} (veja backend/.env.example)`);
  }
  return valor;
}

function inteiro(nome, padrao) {
  const bruto = process.env[nome];
  if (bruto === undefined || bruto === '') return padrao;
  const valor = Number.parseInt(bruto, 10);
  if (Number.isNaN(valor)) throw new Error(`Variável ${nome} deve ser um número inteiro`);
  return valor;
}

const ambiente = process.env.NODE_ENV ?? 'development';
const emTeste = ambiente === 'test';

export const config = Object.freeze({
  ambiente,
  emDesenvolvimento: ambiente === 'development',
  emTeste,
  emProducao: ambiente === 'production',
  raizBackend: RAIZ_BACKEND,
  porta: inteiro('PORT', 3000),

  banco: Object.freeze({
    host: process.env.DB_HOST ?? 'localhost',
    porta: inteiro('DB_PORT', 5432),
    nome: emTeste ? obrigatoria('DB_NAME_TEST') : obrigatoria('DB_NAME'),
    usuario: obrigatoria('DB_USER'),
    senha: obrigatoria('DB_PASSWORD'),
    maxConexoes: inteiro('DB_POOL_MAX', 10),
  }),

  sessao: Object.freeze({
    segredo: obrigatoria('SESSION_SECRET'),
    duracaoMinutos: inteiro('SESSION_MAX_AGE_MIN', 120),
    // Em produção (HTTPS) o cookie só trafega em conexão segura.
    cookieSeguro: process.env.COOKIE_SECURE === 'true',
  }),

  seguranca: Object.freeze({
    custoBcrypt: inteiro('BCRYPT_COST', 12),
    limiteLoginPorJanela: inteiro('RATE_LIMIT_LOGIN_MAX', 5),
    janelaLoginMinutos: inteiro('RATE_LIMIT_LOGIN_JANELA_MIN', 15),
    limiteApiPorMinuto: inteiro('RATE_LIMIT_API_MAX', 300),
  }),

  log: Object.freeze({
    nivel: process.env.LOG_LEVEL ?? (emTeste ? 'aviso' : 'info'),
    arquivo: path.resolve(RAIZ_BACKEND, process.env.LOG_FILE ?? (emTeste ? 'logs/test.log' : 'logs/app.log')),
  }),
});
