# Arquitetura — Cuphead Boss Guide (Trabalho II)

## Visão geral

Arquitetura **cliente-servidor** com o backend organizado em **camadas**
(variação do MVC sem templates no servidor: a "View" é o frontend estático
que consome a API JSON).

```
 Navegador
 ┌───────────────────────────────────────────────┐
 │ frontend/  (HTML + CSS do T1 + JS em módulos) │   Interface
 │  index.html · conta.html · admin.html         │
 └──────────────────────┬────────────────────────┘
                        │ HTTP/JSON (fetch, cookie de sessão, X-CSRF-Token)
 Servidor Node.js / Express
 ┌──────────────────────▼────────────────────────┐
 │ Middlewares: helmet (CSP) → id da requisição  │
 │  → rate limit → JSON → sessão → usuário       │
 │  → CSRF → exigirPermissao(acao)               │
 ├───────────────────────────────────────────────┤
 │ routes/        URL + método → controller      │   Camada HTTP
 │ controllers/   req/res ↔ service              │
 ├───────────────────────────────────────────────┤
 │ services/      regras de negócio + validação  │   Lógica de aplicação
 │ domain/        matriz de permissões           │
 │ validators/    esquemas de entrada            │
 ├───────────────────────────────────────────────┤
 │ repositories/  SQL parametrizado              │   Acesso a dados
 ├───────────────────────────────────────────────┤
 │ config/database.js  (pool pg)                 │
 └──────────────────────┬────────────────────────┘
                        │ protocolo PostgreSQL
                 ┌──────▼──────┐
                 │ PostgreSQL  │
                 └─────────────┘
```

Regra de dependência: cada camada só conhece a camada imediatamente abaixo.
Controllers não escrevem SQL; repositories não conhecem `req`/`res`; services
não sabem que existe HTTP.

## Estrutura de diretórios

```
scom-projeto-cuphead/
├── frontend/                  Interface (servida como arquivos estáticos)
│   ├── index.html             Guia: chefes, conquistas, nova tática
│   ├── conta.html             Login, cadastro e "minhas táticas"
│   ├── admin.html             Painel do administrador
│   ├── css/style.css          Tema vintage (anos 30) e componentes do T2
│   ├── fonts/                 Fontes embutidas (Fascinate, Rye, Libre Baskerville, Special Elite)
│   └── js/
│       ├── api.js             Cliente HTTP (CSRF, erros padronizados)
│       ├── dom.js             Criação segura de elementos (textContent)
│       ├── cabecalho.js       Área do usuário (entrar/sair)
│       ├── inicio.js · conta.js · admin.js   Lógica de cada página
├── backend/
│   ├── src/
│   │   ├── server.js          Ponto de entrada (sobe o HTTP)
│   │   ├── app.js             Composition root: liga as camadas
│   │   ├── config/            env.js (variáveis), database.js, logger.js
│   │   ├── middlewares/       sessão, CSRF, autorização, rate limit, erros
│   │   ├── routes/            Um arquivo por recurso
│   │   ├── controllers/       Um arquivo por recurso
│   │   ├── services/          Regras de negócio + hasher bcrypt
│   │   ├── repositories/      Acesso a dados (SQL)
│   │   ├── validators/        Esquemas de validação
│   │   ├── domain/            permissoes.js (matriz RBAC)
│   │   └── utils/             AppError, validação, helpers HTTP
│   ├── database/
│   │   ├── migrations/        001_criar_tabelas.sql, 002_dados_iniciais.sql
│   │   ├── script_completo.sql  Script único gerado das migrações
│   │   ├── migracoes.js · migrar.js · gerarScriptCompleto.js
│   ├── scripts/               criarAdmin.js, benchmark.js
│   ├── tests/
│   │   ├── unit/              Services, validação e permissões (sem banco)
│   │   └── integracao/        API real + PostgreSQL de testes
│   ├── .env.example           Modelo de configuração (sem segredos)
│   └── package.json
└── docs/                      API.md, ARQUITETURA.md, CHECKLIST.md, relatório
```

## Injeção de dependências

Cada módulo exporta uma *fábrica* (`criarChefeService({ chefeRepository, ilhaRepository, logger })`).
O `app.js` é o único lugar que instancia e conecta tudo. Isso permite que os
testes unitários passem repositórios falsos em memória e testem apenas a regra
de negócio, e que os testes de integração montem a aplicação real com outra
configuração (banco de testes, rate limit menor, logger que captura eventos).

## Fluxo de uma requisição

Exemplo: `POST /api/taticas` enviado por um jogador.

1. `helmet` aplica cabeçalhos de segurança (CSP, `nosniff`, `frame-ancestors`).
2. `requisicao.js` gera o `requisicaoId` (devolvido em `X-Request-Id`).
3. Rate limit geral da API; `express.json` lê o corpo (máx. 10 KB).
4. `express-session` carrega a sessão do PostgreSQL pelo cookie.
5. `criarCarregadorDeUsuario` busca o usuário da sessão no banco (`req.usuario`).
6. `criarProtecaoCsrf` compara `X-CSRF-Token` com o token da sessão.
7. `exigirPermissao('tatica:criar')` consulta a matriz: visitante → 401; perfil sem permissão → 403.
8. `taticaController.criar` chama `taticaService.criar(req.body, req.usuario)`.
9. O service valida/sanitiza (`validar(dados, esquemaNovaTatica)`), confere se o chefe existe,
   grava pelo repository e registra `entidade.criada` no log.
10. O repository executa `INSERT ... VALUES ($1, $2, $3)` com parâmetros.
11. Qualquer exceção em qualquer etapa vai para `tratadorErros.js`, que monta a resposta JSON padronizada.

## Matriz de permissões

Fonte: `backend/src/domain/permissoes.js`.

| Ação | Visitante | Jogador | Admin |
|---|:---:|:---:|:---:|
| Listar/ver chefes e ilhas | ✔ | ✔ | ✔ |
| Criar, editar, excluir chefe | ✘ | ✘ | ✔ |
| Ver táticas aprovadas | ✔ | ✔ | ✔ |
| Enviar tática | ✘ | ✔ | ✔ |
| Ver as próprias táticas | ✘ | ✔ | ✔ |
| Editar/excluir a própria tática (só pendente) | ✘ | ✔ | ✔ |
| Moderar táticas (listar todas, aprovar, rejeitar, excluir qualquer) | ✘ | ✘ | ✔ |
| Ver catálogo de conquistas | ✔ | ✔ | ✔ |
| Marcar/desmarcar o próprio progresso | ✘ | ✔ | ✔ |
| Listar usuários / alterar perfil de outro usuário | ✘ | ✘ | ✔ |

Regras de propriedade ("só o autor", "só enquanto pendente") ficam no
`taticaService`, porque dependem do registro e não apenas do perfil.

## Configuração

Toda configuração vem de variáveis de ambiente lidas em `config/env.js`
(arquivo `backend/.env`, fora do Git). O código não tem senhas, segredos de
sessão nem credenciais de administrador: a aplicação não inicia se uma
variável obrigatória faltar.

## Decisões e alternativas consideradas

| Decisão | Motivo |
|---|---|
| Sessão em vez de JWT | Logout invalida a sessão no servidor imediatamente; cookie `HttpOnly` não fica acessível ao JavaScript. |
| Sessões gravadas no PostgreSQL | Sobrevivem a reinício do servidor e permitem testar a reutilização de sessão após logout. |
| Usuário recarregado do banco a cada requisição | Mudança de perfil ou exclusão de conta vale na hora, sem esperar a sessão expirar. |
| SQL escrito à mão (driver `pg`) em vez de ORM | Consultas visíveis e auditáveis no relatório; parâmetros `$n` em todas elas. |
| Validação nos services | A regra vale para qualquer entrada (HTTP, script `criar-admin`, testes). |
| Frontend sem framework | Continuidade do T1 (HTML/CSS puros); JS em módulos ES nativos, sem build. |
