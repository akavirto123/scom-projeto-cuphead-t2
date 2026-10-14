/**
 * Painel do administrador: CRUD de chefes, moderação de táticas e perfis
 * de usuários. A página verifica o perfil apenas para a interface; quem
 * realmente bloqueia o acesso é o backend (403 para não administradores).
 */
import { api, query } from './api.js';
import { iniciarCabecalho } from './cabecalho.js';
import { el, limparMensagem, mostrarMensagem, seloStatus, substituirConteudo, textoDoErro } from './dom.js';

const $ = (id) => document.getElementById(id);
const estadoChefes = { pagina: 1 };

// ------------------------------------------------------------------ Chefes

function preencherFormulario(chefe) {
  $('chefe-id').value = chefe.id;
  $('chefe-nome').value = chefe.nome;
  $('chefe-fase').value = chefe.fase;
  $('chefe-ilha').value = chefe.ilhaId;
  $('chefe-dificuldade').value = chefe.dificuldade;
  $('chefe-estrategia').value = chefe.estrategia;
  $('chefe-salvar').textContent = 'Salvar alterações';
  $('chefe-cancelar').hidden = false;
  $('chefe-nome').focus();
}

function limparFormulario() {
  $('form-chefe').reset();
  $('chefe-id').value = '';
  $('chefe-salvar').textContent = 'Cadastrar chefe';
  $('chefe-cancelar').hidden = true;
}

async function carregarChefes() {
  const status = $('status-chefe');
  try {
    const { dados, paginacao } = await api.get(`/api/chefes${query({ pagina: estadoChefes.pagina, limite: 10 })}`);
    substituirConteudo($('lista-admin-chefes'), dados.map((chefe) => {
      const editar = el('button', { type: 'button', class: 'btn-pequeno' }, 'Editar');
      const excluir = el('button', { type: 'button', class: 'btn-pequeno btn-perigo' }, 'Excluir');
      editar.addEventListener('click', () => preencherFormulario(chefe));
      excluir.addEventListener('click', async () => {
        if (!window.confirm(`Excluir "${chefe.nome}"? As táticas desse chefe também serão apagadas.`)) return;
        try {
          await api.delete(`/api/chefes/${chefe.id}`);
          mostrarMensagem(status, 'sucesso', `"${chefe.nome}" excluído.`);
          carregarChefes();
        } catch (erro) {
          mostrarMensagem(status, 'erro', textoDoErro(erro));
        }
      });
      return el('tr', {},
        el('td', {}, chefe.nome),
        el('td', {}, chefe.ilhaNome),
        el('td', {}, `${chefe.dificuldade}/5`),
        el('td', { class: 'acoes' }, editar, excluir));
    }));
    $('chefes-pagina').textContent = `Página ${paginacao.pagina} de ${paginacao.totalPaginas}`;
    $('chefes-anterior').disabled = paginacao.pagina <= 1;
    $('chefes-proxima').disabled = paginacao.pagina >= paginacao.totalPaginas;
  } catch (erro) {
    mostrarMensagem(status, 'erro', textoDoErro(erro));
  }
}

async function prepararChefes() {
  const { dados: ilhas } = await api.get('/api/ilhas');
  $('chefe-ilha').append(...ilhas.map((ilha) => el('option', { value: ilha.id }, ilha.nome)));

  $('chefe-cancelar').addEventListener('click', limparFormulario);
  $('chefes-anterior').addEventListener('click', () => { estadoChefes.pagina -= 1; carregarChefes(); });
  $('chefes-proxima').addEventListener('click', () => { estadoChefes.pagina += 1; carregarChefes(); });

  $('form-chefe').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const status = $('status-chefe');
    const id = $('chefe-id').value;
    const dados = {
      nome: $('chefe-nome').value,
      fase: $('chefe-fase').value,
      ilhaId: $('chefe-ilha').value,
      dificuldade: $('chefe-dificuldade').value,
      estrategia: $('chefe-estrategia').value,
    };
    try {
      if (id) await api.put(`/api/chefes/${id}`, dados);
      else await api.post('/api/chefes', dados);
      mostrarMensagem(status, 'sucesso', id ? 'Chefe atualizado.' : 'Chefe cadastrado.');
      limparFormulario();
      carregarChefes();
    } catch (erro) {
      mostrarMensagem(status, 'erro', textoDoErro(erro));
    }
  });

  await carregarChefes();
}

// --------------------------------------------------------------- Moderação

async function carregarModeracao() {
  const status = $('status-moderacao');
  try {
    const { dados } = await api.get(`/api/taticas${query({ status: $('filtro-status').value, limite: 50 })}`);
    if (!dados.length) mostrarMensagem(status, 'info', 'Nenhuma tática nesta categoria.');
    else limparMensagem(status);

    substituirConteudo($('lista-moderacao'), dados.map((tatica) => {
      const acoes = el('td', { class: 'acoes' });
      const acao = (rotulo, classe, executar) => {
        const botao = el('button', { type: 'button', class: `btn-pequeno ${classe}` }, rotulo);
        botao.addEventListener('click', async () => {
          try {
            await executar();
            carregarModeracao();
          } catch (erro) {
            mostrarMensagem(status, 'erro', textoDoErro(erro));
          }
        });
        acoes.append(botao);
      };
      if (tatica.status !== 'aprovada') acao('Aprovar', '', () => api.patch(`/api/taticas/${tatica.id}/status`, { status: 'aprovada' }));
      if (tatica.status !== 'rejeitada') acao('Rejeitar', 'btn-neutro', () => api.patch(`/api/taticas/${tatica.id}/status`, { status: 'rejeitada' }));
      acao('Excluir', 'btn-perigo', async () => {
        if (window.confirm('Excluir esta tática definitivamente?')) await api.delete(`/api/taticas/${tatica.id}`);
      });

      return el('tr', {},
        el('td', {}, tatica.chefeNome),
        el('td', {}, tatica.autorNome),
        el('td', {}, tatica.conteudo),
        el('td', {}, seloStatus(tatica.status)),
        acoes);
    }));
  } catch (erro) {
    mostrarMensagem(status, 'erro', textoDoErro(erro));
  }
}

// ---------------------------------------------------------------- Usuários

async function carregarUsuarios(administrador) {
  const status = $('status-usuarios');
  try {
    const { dados } = await api.get('/api/usuarios?limite=50');
    substituirConteudo($('lista-usuarios'), dados.map((usuario) => {
      const seletor = el('select', { 'aria-label': `Perfil de ${usuario.nome}`, disabled: usuario.id === administrador.id },
        el('option', { value: 'jogador' }, 'Jogador'),
        el('option', { value: 'admin' }, 'Administrador'));
      seletor.value = usuario.perfil;
      seletor.addEventListener('change', async () => {
        try {
          await api.patch(`/api/usuarios/${usuario.id}/perfil`, { perfil: seletor.value });
          mostrarMensagem(status, 'sucesso', `Perfil de ${usuario.nome} atualizado.`);
        } catch (erro) {
          seletor.value = usuario.perfil;
          mostrarMensagem(status, 'erro', textoDoErro(erro));
        }
      });
      return el('tr', {}, el('td', {}, usuario.nome), el('td', {}, usuario.email), el('td', {}, seletor));
    }));
  } catch (erro) {
    mostrarMensagem(status, 'erro', textoDoErro(erro));
  }
}

// ------------------------------------------------------------------ Início

const usuario = await iniciarCabecalho();
if (usuario?.perfil !== 'admin') {
  mostrarMensagem($('status-acesso'), 'erro', usuario
    ? 'Acesso restrito: esta área é exclusiva para administradores.'
    : 'Faça login com uma conta de administrador para acessar esta área.');
} else {
  $('painel-admin').hidden = false;
  $('filtro-status').addEventListener('change', carregarModeracao);
  await Promise.all([prepararChefes(), carregarModeracao(), carregarUsuarios(usuario)]);
}
