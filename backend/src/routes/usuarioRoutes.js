import { Router } from 'express';

export function criarRotasUsuarios({ usuarioController, acesso }) {
  const rotas = Router();
  rotas.get('/', acesso.exigirPermissao('usuario:listar'), usuarioController.listar);
  rotas.patch('/:id/perfil', acesso.exigirPermissao('usuario:alterar_perfil'), usuarioController.alterarPerfil);
  return rotas;
}
