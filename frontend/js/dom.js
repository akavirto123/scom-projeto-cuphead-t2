/**
 * Helpers de DOM.
 *
 * Proteção contra XSS: todo dado vindo da API é inserido como TEXTO
 * (textContent / nós de texto), nunca como HTML. Assim, um conteúdo como
 * "<script>alert(1)</script>" aparece literalmente na tela e não é
 * executado. Nenhum arquivo do frontend usa innerHTML.
 */

/**
 * Cria um elemento. Filhos do tipo string viram nós de texto (escapados).
 *   el('p', { class: 'tag' }, 'Ilha 1')
 */
export function el(tag, atributos = {}, ...filhos) {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === false || valor === null || valor === undefined) continue;
    if (nome.startsWith('on') && typeof valor === 'function') {
      elemento.addEventListener(nome.slice(2), valor);
    } else if (valor === true) {
      elemento.setAttribute(nome, '');
    } else {
      elemento.setAttribute(nome, String(valor));
    }
  }
  for (const filho of filhos.flat()) {
    if (filho === null || filho === undefined || filho === false) continue;
    elemento.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return elemento;
}

export function substituirConteudo(container, ...filhos) {
  container.replaceChildren(...filhos.flat().filter(Boolean));
}

/** Texto amigável a partir de um ErroApi (inclui erros de validação por campo). */
export function textoDoErro(erro) {
  const detalhes = (erro.detalhes ?? []).map((d) => `${d.campo}: ${d.mensagem}`);
  return [erro.message, ...detalhes].join(' ');
}

/** Mostra uma mensagem de status (sucesso/erro/info) em um elemento role="status". */
export function mostrarMensagem(container, tipo, texto) {
  container.className = `mensagem mensagem-${tipo}`;
  container.textContent = texto;
}

export function limparMensagem(container) {
  container.className = 'mensagem';
  container.textContent = '';
}

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
export const formatarData = (iso) => FORMATO_DATA.format(new Date(iso));

export const ROTULOS_STATUS = Object.freeze({ pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada' });

export function seloStatus(status) {
  return el('span', { class: `selo selo-${status}` }, ROTULOS_STATUS[status] ?? status);
}
