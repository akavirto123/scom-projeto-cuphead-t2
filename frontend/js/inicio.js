/**
 * Página inicial: lista de chefes (filtro + paginação), táticas da
 * comunidade, checklist de conquistas e formulário de nova tática.
 */
import { api, query } from './api.js';
import { iniciarCabecalho } from './cabecalho.js';
import { el, formatarData, limparMensagem, mostrarMensagem, substituirConteudo, textoDoErro } from './dom.js';

const POR_PAGINA = 6;
const estado = { pagina: 1, totalPaginas: 1, ilha: '', busca: '', usuario: null };

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ Chefes

function estrelas(dificuldade) {
  return '★'.repeat(dificuldade) + '☆'.repeat(5 - dificuldade);
}

async function alternarTaticas(chefe, botao, container) {
  const abrir = botao.getAttribute('aria-expanded') !== 'true';
  botao.setAttribute('aria-expanded', String(abrir));
  container.hidden = !abrir;
  if (!abrir || container.dataset.carregado) return;

  substituirConteudo(container, el('p', {}, 'Carregando táticas...'));
  try {
    const { dados } = await api.get(`/api/chefes/${chefe.id}/taticas`);
    container.dataset.carregado = 'sim';
    substituirConteudo(
      container,
      dados.length
        ? el('ul', { class: 'lista-taticas' }, dados.map((t) =>
            el('li', {}, el('p', {}, t.conteudo), el('small', {}, `— ${t.autorNome}, ${formatarData(t.criadoEm)}`))))
        : el('p', {}, 'Nenhuma tática aprovada ainda. Seja o primeiro a sugerir!'),
    );
  } catch (erro) {
    substituirConteudo(container, el('p', { class: 'mensagem mensagem-erro' }, textoDoErro(erro)));
  }
}

function cartaoDoChefe(chefe) {
  const idTaticas = `taticas-chefe-${chefe.id}`;
  const listaTaticas = el('div', { id: idTaticas, class: 'taticas-comunidade', hidden: true });
  const botao = el(
    'button',
    { type: 'button', class: 'btn-taticas', 'aria-expanded': 'false', 'aria-controls': idTaticas },
    `Táticas da comunidade (${chefe.totalTaticas})`,
  );
  botao.addEventListener('click', () => alternarTaticas(chefe, botao, listaTaticas));

  return el(
    'article',
    { class: 'card' },
    el('h3', {}, chefe.nome),
    el('p', { class: 'tag' }, `${chefe.ilhaNome} - ${chefe.fase}`),
    el('p', { class: 'dificuldade', 'aria-label': `Dificuldade ${chefe.dificuldade} de 5` }, estrelas(chefe.dificuldade)),
    el('p', {}, chefe.estrategia),
    botao,
    listaTaticas,
  );
}

async function carregarChefes() {
  const status = $('status-chefes');
  const lista = $('lista-chefes');
  mostrarMensagem(status, 'info', 'Carregando chefes...');
  lista.setAttribute('aria-busy', 'true');

  try {
    const { dados, paginacao } = await api.get(
      `/api/chefes${query({ pagina: estado.pagina, limite: POR_PAGINA, ilha: estado.ilha, busca: estado.busca })}`,
    );
    estado.totalPaginas = paginacao.totalPaginas;
    substituirConteudo(lista, dados.map(cartaoDoChefe));

    if (dados.length) limparMensagem(status);
    else mostrarMensagem(status, 'info', estado.busca
      ? `Nenhum chefe encontrado para "${estado.busca}".`
      : 'Nenhum chefe encontrado.');

    $('pagina-info').textContent = `Página ${paginacao.pagina} de ${paginacao.totalPaginas} (${paginacao.total} chefes)`;
    $('pagina-anterior').disabled = paginacao.pagina <= 1;
    $('pagina-proxima').disabled = paginacao.pagina >= paginacao.totalPaginas;
  } catch (erro) {
    substituirConteudo(lista);
    mostrarMensagem(status, 'erro', textoDoErro(erro));
  } finally {
    lista.removeAttribute('aria-busy');
  }
}

async function carregarFiltros() {
  const { dados: ilhas } = await api.get('/api/ilhas');
  $('filtro-ilha').append(...ilhas.map((ilha) => el('option', { value: ilha.id }, ilha.nome)));

  $('form-filtros').addEventListener('submit', (evento) => {
    evento.preventDefault();
    estado.ilha = $('filtro-ilha').value;
    estado.busca = $('filtro-busca').value.trim();
    estado.pagina = 1;
    carregarChefes();
  });
  $('pagina-anterior').addEventListener('click', () => { estado.pagina -= 1; carregarChefes(); });
  $('pagina-proxima').addEventListener('click', () => { estado.pagina += 1; carregarChefes(); });
}

// -------------------------------------------------------------- Conquistas

function atualizarProgresso(concluidas, total) {
  const percentual = total ? Math.round((concluidas / total) * 100) : 0;
  $('progresso-texto').textContent = `Seu progresso: ${concluidas} de ${total} conquistas (${percentual}%)`;
  const barra = $('progresso-barra');
  barra.hidden = false;
  barra.value = percentual;
}

async function carregarConquistas() {
  const lista = $('lista-conquistas');
  try {
    const { dados: conquistas } = await api.get('/api/conquistas');
    let concluidas = new Set();

    if (estado.usuario) {
      const { dados } = await api.get('/api/conquistas/progresso');
      concluidas = new Set(dados.itens.map((item) => item.conquistaId));
      atualizarProgresso(concluidas.size, conquistas.length);
    }

    substituirConteudo(lista, conquistas.map((conquista) => {
      const texto = [el('strong', {}, `${conquista.nome}:`), ` ${conquista.descricao}`];
      if (!estado.usuario) return el('li', {}, ...texto);

      const caixa = el('input', { type: 'checkbox', id: `conquista-${conquista.id}`, checked: concluidas.has(conquista.id) });
      caixa.addEventListener('change', async () => {
        caixa.disabled = true;
        try {
          const url = `/api/conquistas/${conquista.id}/progresso`;
          if (caixa.checked) { await api.put(url); concluidas.add(conquista.id); }
          else { await api.delete(url); concluidas.delete(conquista.id); }
          atualizarProgresso(concluidas.size, conquistas.length);
        } catch (erro) {
          caixa.checked = !caixa.checked;
          $('progresso-texto').textContent = textoDoErro(erro);
        } finally {
          caixa.disabled = false;
        }
      });
      return el('li', { class: 'conquista-marcavel' }, el('label', { for: caixa.id }, caixa, ...texto));
    }));
  } catch (erro) {
    substituirConteudo(lista, el('li', {}, textoDoErro(erro)));
  }
}

// ----------------------------------------------------------- Nova tática

async function prepararFormularioDeTatica() {
  const form = $('form-tatica');
  const status = $('status-tatica');
  const campos = form.querySelectorAll('select, textarea, button');

  if (!estado.usuario) {
    campos.forEach((campo) => { campo.disabled = true; });
    return;
  }
  $('aviso-login-tatica').hidden = true;

  const { dados: chefes } = await api.get('/api/chefes?limite=50');
  $('tatica-chefe').append(...chefes.map((chefe) => el('option', { value: chefe.id }, chefe.nome)));

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const botao = form.querySelector('button');
    botao.disabled = true;
    try {
      await api.post('/api/taticas', {
        chefeId: $('tatica-chefe').value,
        conteudo: $('tatica-conteudo').value,
      });
      form.reset();
      mostrarMensagem(status, 'sucesso', 'Tática enviada! Ela aparecerá no guia depois de aprovada pela moderação.');
    } catch (erro) {
      mostrarMensagem(status, 'erro', textoDoErro(erro));
    } finally {
      botao.disabled = false;
    }
  });
}

// ------------------------------------------------------------------ Início

estado.usuario = await iniciarCabecalho();
await Promise.all([
  carregarFiltros().then(carregarChefes).catch((erro) => mostrarMensagem($('status-chefes'), 'erro', textoDoErro(erro))),
  carregarConquistas(),
  prepararFormularioDeTatica().catch((erro) => mostrarMensagem($('status-tatica'), 'erro', textoDoErro(erro))),
]);
