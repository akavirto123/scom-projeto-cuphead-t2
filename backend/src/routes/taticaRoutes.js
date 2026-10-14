import { Router } from 'express';

export function criarRotasTaticas({ taticaController, acesso }) {
  const rotas = Router();
  rotas.get('/', acesso.exigirPermissao('tatica:moderar'), taticaController.listarParaModeracao);
  rotas.post('/', acesso.exigirPermissao('tatica:criar'), taticaController.criar);
  rotas.get('/minhas', acesso.exigirPermissao('tatica:listar_proprias'), taticaController.listarMinhas);
  rotas.patch('/:id', acesso.exigirPermissao('tatica:editar_propria'), taticaController.editar);
  rotas.patch('/:id/status', acesso.exigirPermissao('tatica:moderar'), taticaController.moderar);
  // A regra "autor da tática pendente OU administrador" é verificada no service.
  rotas.delete('/:id', acesso.exigirPermissao('tatica:excluir_propria'), taticaController.excluir);
  return rotas;
}
