/**
 * Área do usuário no cabeçalho (comum a todas as páginas):
 * "Entrar" para visitantes; nome, link de administração e "Sair" para
 * usuários logados.
 */
import { carregarSessao, sair } from './api.js';
import { el, substituirConteudo } from './dom.js';

export async function iniciarCabecalho() {
  const area = document.getElementById('area-usuario');
  let usuario = null;
  try {
    usuario = await carregarSessao();
  } catch {
    substituirConteudo(area, el('span', { class: 'aviso-offline' }, 'Servidor indisponível'));
    return null;
  }

  if (!usuario) {
    substituirConteudo(area, el('a', { href: 'conta.html', class: 'btn-entrar' }, 'Entrar'));
    return null;
  }

  const botaoSair = el('button', { type: 'button', class: 'btn-sair' }, 'Sair');
  botaoSair.addEventListener('click', async () => {
    botaoSair.disabled = true;
    try {
      await sair();
    } finally {
      window.location.assign('index.html');
    }
  });

  substituirConteudo(
    area,
    el('a', { href: 'conta.html', class: 'usuario-nome', title: 'Minha conta' }, usuario.nome),
    usuario.perfil === 'admin' ? el('a', { href: 'admin.html', class: 'btn-admin' }, 'Admin') : null,
    botaoSair,
  );
  return usuario;
}
