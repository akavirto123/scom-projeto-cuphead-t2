import { Router } from 'express';

export function criarRotasAuth({ authController, acesso, limitadorDeLogin }) {
  const rotas = Router();
  rotas.get('/sessao', authController.sessao);
  rotas.post('/registro', authController.registrar);
  rotas.post('/login', limitadorDeLogin, authController.login);
  rotas.post('/logout', acesso.exigirAutenticacao, authController.logout);
  rotas.get('/me', acesso.exigirAutenticacao, authController.eu);
  return rotas;
}
