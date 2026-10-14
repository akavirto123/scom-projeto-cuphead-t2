import { Router } from 'express';

export function criarRotasChefes({ chefeController, taticaController, acesso }) {
  const rotas = Router();
  rotas.get('/', acesso.exigirPermissao('chefe:listar'), chefeController.listar);
  rotas.post('/', acesso.exigirPermissao('chefe:criar'), chefeController.criar);
  rotas.get('/:id', acesso.exigirPermissao('chefe:listar'), chefeController.obter);
  rotas.put('/:id', acesso.exigirPermissao('chefe:editar'), chefeController.atualizar);
  rotas.delete('/:id', acesso.exigirPermissao('chefe:excluir'), chefeController.excluir);
  rotas.get('/:id/taticas', acesso.exigirPermissao('tatica:listar_aprovadas'), taticaController.listarDoChefe);
  return rotas;
}

export function criarRotasIlhas({ chefeController }) {
  const rotas = Router();
  rotas.get('/', chefeController.listarIlhas);
  return rotas;
}
