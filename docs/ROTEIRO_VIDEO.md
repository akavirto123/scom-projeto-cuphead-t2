# Roteiro do vídeo de demonstração (~5 minutos)

O enunciado só cita o vídeo nas penalidades ("ausência de vídeo: −10 pts").
Confirme com o professor a duração e a forma de entrega.

1. **Subir o sistema (30 s)**
   `cd backend` → `npm run db:migrar` → `npm start` → abrir <http://localhost:3000>.
2. **Visitante (30 s)**
   Ver os chefes, filtrar por ilha, buscar "devil", trocar de página.
   Mostrar que o formulário "Sugerir Nova Tática" está bloqueado.
3. **Jogador (1 min)**
   Criar conta em *Entrar*, fazer login, marcar conquistas, recarregar a página
   (o progresso continua), enviar uma tática e vê-la como *Pendente* em *Minha Conta*.
4. **Administrador (1 min)**
   Sair, entrar com o admin do `.env`, aprovar a tática em *Moderação* e mostrar
   que ela aparece no card do chefe. Criar, editar e excluir um chefe.
5. **Segurança (1 min)**
   Em outro terminal (Git Bash): `bash scripts/demonstrar-seguranca.sh`.
   Comentar os 401, 403, 422 e 429. Mostrar a tática com `<script>` aparecendo
   como texto no navegador.
6. **Qualidade (1 min)**
   `npm test` (56 testes passando), `git log --oneline --graph --all`,
   abrir `backend/logs/app.log` e mostrar os eventos de login e criação.
