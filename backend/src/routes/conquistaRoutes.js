import { Router } from 'express';

export function criarRotasConquistas({ conquistaController, acesso }) {
  const rotas = Router();
  rotas.get('/', acesso.exigirPermissao('conquista:listar'), conquistaController.listar);
  rotas.get('/progresso', acesso.exigirPermissao('conquista:marcar_progresso'), conquistaController.progresso);
  rotas.put('/:id/progresso', acesso.exigirPermissao('conquista:marcar_progresso'), conquistaController.marcar);
  rotas.delete('/:id/progresso', acesso.exigirPermissao('conquista:marcar_progresso'), conquistaController.desmarcar);
  return rotas;
}
