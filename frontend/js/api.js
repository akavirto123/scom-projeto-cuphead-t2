/**
 * Cliente da API REST.
 *
 * - Envia o cookie de sessão (mesma origem) em todas as chamadas.
 * - Anexa o token CSRF no cabeçalho X-CSRF-Token em requisições que
 *   alteram dados.
 * - Converte respostas de erro padronizadas em exceções ErroApi.
 */
let tokenCsrf = null;

export class ErroApi extends Error {
  constructor(status, erro) {
    super(erro?.mensagem ?? 'Não foi possível falar com o servidor.');
    this.name = 'ErroApi';
    this.status = status;
    this.codigo = erro?.codigo ?? 'ERRO_DE_REDE';
    this.detalhes = erro?.detalhes ?? [];
  }
}

async function requisitar(metodo, url, corpo) {
  const cabecalhos = { Accept: 'application/json' };
  const opcoes = { method: metodo, headers: cabecalhos, credentials: 'same-origin' };

  if (corpo !== undefined) {
    cabecalhos['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(corpo);
  }
  if (metodo !== 'GET' && tokenCsrf) cabecalhos['X-CSRF-Token'] = tokenCsrf;

  let resposta;
  try {
    resposta = await fetch(url, opcoes);
  } catch {
    throw new ErroApi(0, null);
  }
  if (resposta.status === 204) return null;

  const json = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new ErroApi(resposta.status, json?.erro);
  return json;
}

export const api = {
  get: (url) => requisitar('GET', url),
  post: (url, corpo) => requisitar('POST', url, corpo),
  put: (url, corpo) => requisitar('PUT', url, corpo),
  patch: (url, corpo) => requisitar('PATCH', url, corpo),
  delete: (url) => requisitar('DELETE', url),
};

/** Monta "?a=1&b=2" ignorando valores vazios. */
export function query(parametros) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') busca.set(chave, valor);
  }
  const texto = busca.toString();
  return texto ? `?${texto}` : '';
}

/** Estado da sessão: usuário logado (ou null) e token CSRF. */
export async function carregarSessao() {
  const { dados } = await api.get('/api/auth/sessao');
  tokenCsrf = dados.csrfToken;
  return dados.usuario;
}

export async function entrar(email, senha) {
  const { dados } = await api.post('/api/auth/login', { email, senha });
  tokenCsrf = dados.csrfToken; // o servidor gera um token novo após o login
  return dados.usuario;
}

export async function sair() {
  await api.post('/api/auth/logout');
  tokenCsrf = null;
}
