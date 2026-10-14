/**
 * Página "Minha Conta": login e cadastro (visitante) ou dados da conta e
 * gestão das próprias táticas (usuário logado).
 */
import { api, entrar } from './api.js';
import { iniciarCabecalho } from './cabecalho.js';
import { el, mostrarMensagem, seloStatus, substituirConteudo, textoDoErro } from './dom.js';

const $ = (id) => document.getElementById(id);
const ROTULOS_PERFIL = { jogador: 'Jogador', admin: 'Administrador' };

function aoEnviar(form, statusId, acao) {
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      await acao(new FormData(form));
    } catch (erro) {
      mostrarMensagem($(statusId), 'erro', textoDoErro(erro));
    } finally {
      botao.disabled = false;
    }
  });
}

function prepararVisitante() {
  $('painel-visitante').hidden = false;

  aoEnviar($('form-login'), 'status-login', async (dados) => {
    await entrar(dados.get('email'), dados.get('senha'));
    window.location.assign('index.html');
  });

  aoEnviar($('form-cadastro'), 'status-cadastro', async (dados) => {
    await api.post('/api/auth/registro', {
      nome: dados.get('nome'),
      email: dados.get('email'),
      senha: dados.get('senha'),
    });
    $('form-cadastro').reset();
    mostrarMensagem($('status-cadastro'), 'sucesso', 'Conta criada! Agora é só entrar ao lado.');
    $('login-email').value = dados.get('email');
    $('login-senha').focus();
  });
}

function linhaDaTatica(tatica, recarregar) {
  const status = $('status-minhas');
  const celulaTexto = el('td', {}, tatica.conteudo);
  const acoes = el('td', { class: 'acoes' });

  if (tatica.status === 'pendente') {
    const editar = el('button', { type: 'button', class: 'btn-pequeno' }, 'Editar');
    const excluir = el('button', { type: 'button', class: 'btn-pequeno btn-perigo' }, 'Excluir');

    editar.addEventListener('click', () => {
      const area = el('textarea', { 'aria-label': `Editar tática para ${tatica.chefeNome}`, maxlength: 1000 });
      area.value = tatica.conteudo;
      const salvar = el('button', { type: 'button', class: 'btn-pequeno' }, 'Salvar');
      const cancelar = el('button', { type: 'button', class: 'btn-pequeno btn-neutro' }, 'Cancelar');
      substituirConteudo(celulaTexto, area);
      substituirConteudo(acoes, salvar, cancelar);
      area.focus();

      cancelar.addEventListener('click', recarregar);
      salvar.addEventListener('click', async () => {
        try {
          await api.patch(`/api/taticas/${tatica.id}`, { conteudo: area.value });
          mostrarMensagem(status, 'sucesso', 'Tática atualizada.');
          recarregar();
        } catch (erro) {
          mostrarMensagem(status, 'erro', textoDoErro(erro));
        }
      });
    });

    excluir.addEventListener('click', async () => {
      if (!window.confirm('Excluir esta tática?')) return;
      try {
        await api.delete(`/api/taticas/${tatica.id}`);
        mostrarMensagem(status, 'sucesso', 'Tática excluída.');
        recarregar();
      } catch (erro) {
        mostrarMensagem(status, 'erro', textoDoErro(erro));
      }
    });
    acoes.append(editar, excluir);
  } else {
    acoes.append('—');
  }

  return el('tr', {}, el('td', {}, tatica.chefeNome), celulaTexto, el('td', {}, seloStatus(tatica.status)), acoes);
}

async function carregarMinhasTaticas() {
  const corpo = $('lista-minhas');
  try {
    const { dados } = await api.get('/api/taticas/minhas');
    substituirConteudo(
      corpo,
      dados.length
        ? dados.map((tatica) => linhaDaTatica(tatica, carregarMinhasTaticas))
        : el('tr', {}, el('td', { colspan: 4 }, 'Você ainda não enviou nenhuma tática.')),
    );
  } catch (erro) {
    mostrarMensagem($('status-minhas'), 'erro', textoDoErro(erro));
  }
}

const usuario = await iniciarCabecalho();
if (usuario) {
  $('painel-usuario').hidden = false;
  $('conta-nome').textContent = usuario.nome;
  $('conta-email').textContent = usuario.email;
  $('conta-perfil').textContent = ROTULOS_PERFIL[usuario.perfil] ?? usuario.perfil;
  carregarMinhasTaticas();
} else {
  prepararVisitante();
}
