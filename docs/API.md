# Documentação da API — Cuphead Boss Guide

API REST em JSON servida em `http://localhost:3000/api`.

## Convenções

### Autenticação e sessão

- A autenticação é por **sessão** (cookie `cuphead.sid`, `HttpOnly`, `SameSite=Strict`).
- O navegador envia o cookie automaticamente; ferramentas como `curl` precisam guardá-lo
  (`-c cookies.txt -b cookies.txt`).

### Proteção CSRF

Toda requisição `POST`, `PUT`, `PATCH` ou `DELETE` precisa do cabeçalho
`X-CSRF-Token` com o token obtido em `GET /api/auth/sessao`. O login devolve um
**token novo**, que deve substituir o anterior.

### Formato das respostas

Sucesso:

```json
{ "dados": { ... } }
```

Listagens paginadas incluem `paginacao`:

```json
{ "dados": [ ... ], "paginacao": { "pagina": 1, "limite": 6, "total": 19, "totalPaginas": 4 } }
```

Erro (todas as rotas):

```json
{
  "erro": {
    "status": 422,
    "codigo": "VALIDACAO",
    "mensagem": "Os dados enviados são inválidos.",
    "requisicaoId": "2df0b9ae-bcc7-4214-8fa4-eb84460f3315",
    "detalhes": [{ "campo": "dificuldade", "mensagem": "deve ser menor ou igual a 5." }]
  }
}
```

Com `NODE_ENV=development`, erros inesperados (500) também trazem o bloco `tecnico`
(nome, mensagem original e stack trace). Em produção esse bloco nunca aparece.

### Códigos de status usados

| Status | Código (`erro.codigo`) | Quando |
|---|---|---|
| 200 | — | Leitura ou atualização bem-sucedida |
| 201 | — | Recurso criado (cabeçalho `Location` aponta para ele) |
| 204 | — | Sucesso sem corpo (logout, exclusão, marcar conquista) |
| 400 | `JSON_INVALIDO` | Corpo da requisição não é JSON válido |
| 401 | `NAO_AUTENTICADO` | Rota exige login |
| 401 | `CREDENCIAIS_INVALIDAS` | E-mail ou senha incorretos |
| 403 | `ACESSO_NEGADO` | Perfil sem permissão (ver matriz em [ARQUITETURA.md](ARQUITETURA.md)) |
| 403 | `CSRF_INVALIDO` | Cabeçalho `X-CSRF-Token` ausente ou incorreto |
| 404 | `NAO_ENCONTRADO` / `ROTA_NAO_ENCONTRADA` | Registro ou rota inexistente |
| 409 | `CONFLITO` | E-mail/nome duplicado, tática já moderada, alterar o próprio perfil |
| 413 | `CORPO_MUITO_GRANDE` | Corpo maior que 10 KB |
| 422 | `VALIDACAO` | Tipo, tamanho ou formato inválido (lista em `detalhes`) |
| 429 | `MUITAS_REQUISICOES` | Rate limit excedido (login ou API) |
| 500 | `ERRO_INTERNO` | Falha inesperada (registrada no log com `requisicaoId`) |

### Perfis

`visitante` (sem login), `jogador` (padrão no cadastro) e `admin`.

---

## Índice

| Método | URL | Acesso |
|---|---|---|
| GET | [/api/saude](#get-apisaude) | público |
| GET | [/api/auth/sessao](#get-apiauthsessao) | público |
| POST | [/api/auth/registro](#post-apiauthregistro) | público |
| POST | [/api/auth/login](#post-apiauthlogin) | público (rate limit) |
| POST | [/api/auth/logout](#post-apiauthlogout) | logado |
| GET | [/api/auth/me](#get-apiauthme) | logado |
| GET | [/api/ilhas](#get-apiilhas) | público |
| GET | [/api/chefes](#get-apichefes) | público |
| GET | [/api/chefes/:id](#get-apichefesid) | público |
| POST | [/api/chefes](#post-apichefes) | admin |
| PUT | [/api/chefes/:id](#put-apichefesid) | admin |
| DELETE | [/api/chefes/:id](#delete-apichefesid) | admin |
| GET | [/api/chefes/:id/taticas](#get-apichefesidtaticas) | público |
| POST | [/api/taticas](#post-apitaticas) | jogador, admin |
| GET | [/api/taticas/minhas](#get-apitaticasminhas) | jogador, admin |
| PATCH | [/api/taticas/:id](#patch-apitaticasid) | autor (tática pendente) |
| DELETE | [/api/taticas/:id](#delete-apitaticasid) | autor (pendente) ou admin |
| GET | [/api/taticas](#get-apitaticas) | admin |
| PATCH | [/api/taticas/:id/status](#patch-apitaticasidstatus) | admin |
| GET | [/api/conquistas](#get-apiconquistas) | público |
| GET | [/api/conquistas/progresso](#get-apiconquistasprogresso) | jogador, admin |
| PUT | [/api/conquistas/:id/progresso](#put-apiconquistasidprogresso) | jogador, admin |
| DELETE | [/api/conquistas/:id/progresso](#delete-apiconquistasidprogresso) | jogador, admin |
| GET | [/api/usuarios](#get-apiusuarios) | admin |
| PATCH | [/api/usuarios/:id/perfil](#patch-apiusuariosidperfil) | admin |

---

## Saúde

### GET /api/saude

Verifica se a API e o banco estão respondendo.

**Parâmetros:** nenhum.

```bash
curl http://localhost:3000/api/saude
```

```json
{ "dados": { "status": "ok", "banco": "ok" } }
```

**Status:** `200`, `500` (banco indisponível).

---

## Autenticação

### GET /api/auth/sessao

Retorna o usuário logado (ou `null`) e o token CSRF da sessão. É a primeira chamada do frontend.

**Parâmetros:** nenhum.

```bash
curl -c cookies.txt -b cookies.txt http://localhost:3000/api/auth/sessao
```

```json
{ "dados": { "usuario": null, "csrfToken": "I8bheqSPZxh4GORdVYSbqZJvIHBMyNJhKqCkg-5M5AM" } }
```

**Status:** `200`.

### POST /api/auth/registro

Cria uma conta com perfil `jogador`. Campos extras (ex.: `perfil`) são ignorados.

**Corpo (JSON):**

| Campo | Tipo | Regras |
|---|---|---|
| `nome` | texto | obrigatório, 2–60 caracteres |
| `email` | texto | obrigatório, e-mail válido, até 254 caracteres (convertido para minúsculas) |
| `senha` | texto | obrigatório, 8+ caracteres, letras e números, até 72 bytes |

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" \
  -d '{"nome":"Cuphead","email":"cup@head.com","senha":"xicara123"}'
```

```json
{
  "dados": { "id": 2, "nome": "Cuphead", "email": "cup@head.com", "perfil": "jogador", "criadoEm": "2026-10-14T17:13:40.620Z" }
}
```

**Status:** `201`, `403` (CSRF), `409` (e-mail já cadastrado), `422`.

### POST /api/auth/login

Autentica e cria a sessão. O id de sessão é regenerado (anti-fixação) e um **novo token CSRF** é devolvido.
Limitado a `RATE_LIMIT_LOGIN_MAX` tentativas malsucedidas por IP a cada `RATE_LIMIT_LOGIN_JANELA_MIN` minutos.

**Corpo (JSON):** `email` (texto, obrigatório), `senha` (texto, obrigatório).

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" \
  -d '{"email":"cup@head.com","senha":"xicara123"}'
```

```json
{
  "dados": {
    "usuario": { "id": 2, "nome": "Cuphead", "email": "cup@head.com", "perfil": "jogador", "criadoEm": "2026-10-14T17:13:40.620Z" },
    "csrfToken": "RMBNkIqvIVZ8zJvx7kQvLUQUd6Mnrq8bDTWoCPp2sp4"
  }
}
```

Credenciais erradas (mesma resposta para e-mail inexistente ou senha incorreta):

```json
{ "erro": { "status": 401, "codigo": "CREDENCIAIS_INVALIDAS", "mensagem": "E-mail ou senha incorretos.", "requisicaoId": "f387e924-299a-423b-a5b2-50c3b2ecc659" } }
```

**Status:** `200`, `401`, `403` (CSRF), `422`, `429`.

### POST /api/auth/logout

Destroi a sessão no servidor e apaga o cookie. O cookie antigo deixa de valer.

**Parâmetros:** nenhum (exige `X-CSRF-Token`).

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/logout -H "X-CSRF-Token: <token>"
```

Resposta: corpo vazio.

**Status:** `204`, `401`, `403` (CSRF).

### GET /api/auth/me

Dados do usuário logado.

```bash
curl -b cookies.txt http://localhost:3000/api/auth/me
```

```json
{ "dados": { "id": 2, "nome": "Cuphead", "email": "cup@head.com", "perfil": "jogador", "criadoEm": "2026-10-14T17:13:40.620Z" } }
```

**Status:** `200`, `401`.

---

## Ilhas

### GET /api/ilhas

```bash
curl http://localhost:3000/api/ilhas
```

```json
{
  "dados": [
    { "id": 1, "nome": "Ilha 1", "ordem": 1 },
    { "id": 2, "nome": "Ilha 2", "ordem": 2 },
    { "id": 3, "nome": "Ilha 3", "ordem": 3 },
    { "id": 4, "nome": "Inkwell Hell", "ordem": 4 }
  ]
}
```

**Status:** `200`.

---

## Chefes

Objeto `Chefe`:

```json
{
  "id": 1,
  "nome": "The Root Pack",
  "fase": "Botanic Panic",
  "estrategia": "O FSM transita de forma linear: Batata (projéteis horizontais), ...",
  "dificuldade": 1,
  "ilhaId": 1,
  "ilhaNome": "Ilha 1",
  "criadoEm": "2026-10-14T17:12:36.512Z",
  "atualizadoEm": "2026-10-14T17:12:36.512Z",
  "totalTaticas": 1
}
```

### GET /api/chefes

Lista paginada, ordenada por ilha.

**Query string:**

| Parâmetro | Tipo | Padrão | Regras |
|---|---|---|---|
| `pagina` | inteiro | 1 | ≥ 1 |
| `limite` | inteiro | 6 | 1–50 |
| `ilha` | inteiro | — | id da ilha |
| `busca` | texto | — | 1–60 caracteres; procura em nome e fase, sem diferenciar maiúsculas |

```bash
curl "http://localhost:3000/api/chefes?ilha=4&busca=dev"
```

```json
{
  "dados": [
    { "id": 19, "nome": "The Devil", "fase": "One Hell of a Time", "estrategia": "Fase 1: Leia os olhos dele ...", "dificuldade": 5,
      "ilhaId": 4, "ilhaNome": "Inkwell Hell", "criadoEm": "...", "atualizadoEm": "...", "totalTaticas": 0 }
  ],
  "paginacao": { "pagina": 1, "limite": 6, "total": 1, "totalPaginas": 1 }
}
```

**Status:** `200`, `422` (ex.: `limite=999`).

### GET /api/chefes/:id

**Parâmetros de rota:** `id` (inteiro ≥ 1).

```bash
curl http://localhost:3000/api/chefes/1
```

Resposta: `{ "dados": Chefe }`.

**Status:** `200`, `404`, `422` (id não numérico).

### POST /api/chefes

Somente **admin**.

**Corpo (JSON):**

| Campo | Tipo | Regras |
|---|---|---|
| `nome` | texto | obrigatório, 2–60, único (sem diferenciar maiúsculas) |
| `fase` | texto | obrigatório, 2–80 |
| `ilhaId` | inteiro | obrigatório, ilha existente |
| `estrategia` | texto | obrigatório, 20–1000, aceita quebras de linha |
| `dificuldade` | inteiro | obrigatório, 1–5 |

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/chefes \
  -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" \
  -d '{"nome":"Glumstone the Giant","fase":"Doggone Dogfight","ilhaId":4,"estrategia":"Atire nos olhos e evite as mãos.","dificuldade":4}'
```

```json
{
  "dados": { "id": 20, "nome": "Glumstone the Giant", "fase": "Doggone Dogfight", "estrategia": "Atire nos olhos e evite as mãos.",
             "dificuldade": 4, "ilhaId": 4, "ilhaNome": "Inkwell Hell", "criadoEm": "...", "atualizadoEm": "...", "totalTaticas": 0 }
}
```

Cabeçalho `Location: /api/chefes/20`.

**Status:** `201`, `401`, `403`, `409` (nome duplicado), `422`.

### PUT /api/chefes/:id

Somente **admin**. Substitui todos os campos (mesmo corpo do `POST`).

```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/chefes/20 \
  -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" \
  -d '{"nome":"Glumstone","fase":"Doggone Dogfight","ilhaId":4,"estrategia":"Estratégia atualizada pelo administrador.","dificuldade":3}'
```

Resposta: `{ "dados": Chefe }` atualizado.

**Status:** `200`, `401`, `403`, `404`, `409`, `422`.

### DELETE /api/chefes/:id

Somente **admin**. Remove o chefe e, em cascata, as táticas dele.

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/chefes/20 -H "X-CSRF-Token: <token>"
```

Resposta: corpo vazio.

**Status:** `204`, `401`, `403`, `404`.

### GET /api/chefes/:id/taticas

Táticas **aprovadas** do chefe, mais recentes primeiro.

```bash
curl http://localhost:3000/api/chefes/1/taticas
```

```json
{
  "dados": [
    { "id": 1, "conteudo": "Fique no canto durante a fase da cenoura.", "status": "aprovada", "chefeId": 1, "chefeNome": "The Root Pack",
      "usuarioId": 2, "autorNome": "Cuphead", "criadoEm": "...", "atualizadoEm": "..." }
  ]
}
```

**Status:** `200`, `404`, `422`.

---

## Táticas da comunidade

Objeto `Tatica`: `id`, `conteudo`, `status` (`pendente` | `aprovada` | `rejeitada`), `chefeId`, `chefeNome`,
`usuarioId`, `autorNome`, `criadoEm`, `atualizadoEm`.

### POST /api/taticas

Jogador ou admin envia uma tática. Ela nasce `pendente`.

**Corpo (JSON):** `chefeId` (inteiro, chefe existente), `conteudo` (texto, 10–1000, aceita quebras de linha).

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/taticas \
  -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" \
  -d '{"chefeId":1,"conteudo":"Fique no canto durante a fase da cenoura."}'
```

```json
{
  "dados": { "id": 1, "conteudo": "Fique no canto durante a fase da cenoura.", "status": "pendente", "chefeId": 1,
             "chefeNome": "The Root Pack", "usuarioId": 2, "autorNome": "Cuphead", "criadoEm": "...", "atualizadoEm": "..." }
}
```

**Status:** `201`, `401`, `403` (CSRF), `422` (inclui chefe inexistente).

### GET /api/taticas/minhas

Todas as táticas do usuário logado (qualquer status).

```bash
curl -b cookies.txt http://localhost:3000/api/taticas/minhas
```

Resposta: `{ "dados": [Tatica, ...] }`.

**Status:** `200`, `401`.

### PATCH /api/taticas/:id

O **autor** altera o conteúdo enquanto a tática está `pendente`.

**Corpo (JSON):** `conteudo` (texto, 10–1000).

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/taticas/1 \
  -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" \
  -d '{"conteudo":"Conteúdo editado pelo autor enquanto pendente."}'
```

Resposta: `{ "dados": Tatica }`.

**Status:** `200`, `401`, `403` (não é o autor), `404`, `409` (já moderada), `422`.

### DELETE /api/taticas/:id

O autor exclui a própria tática pendente; o **admin** exclui qualquer uma.

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/taticas/1 -H "X-CSRF-Token: <token>"
```

**Status:** `204`, `401`, `403`, `404`, `409`.

### GET /api/taticas

Fila de moderação (somente **admin**), mais antigas primeiro.

**Query string:** `status` (`pendente` | `aprovada` | `rejeitada`, opcional), `pagina`, `limite` (padrão 20, máx. 50).

```bash
curl -b cookies.txt "http://localhost:3000/api/taticas?status=pendente"
```

Resposta: `{ "dados": [Tatica, ...], "paginacao": { ... } }`.

**Status:** `200`, `401`, `403`, `422`.

### PATCH /api/taticas/:id/status

Aprova ou rejeita uma tática (somente **admin**).

**Corpo (JSON):** `status` (`aprovada` | `rejeitada`).

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/taticas/1/status \
  -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" -d '{"status":"aprovada"}'
```

Resposta: `{ "dados": Tatica }` com o novo status.

**Status:** `200`, `401`, `403`, `404`, `422`.

---

## Conquistas

### GET /api/conquistas

Catálogo com as 28 conquistas.

```bash
curl http://localhost:3000/api/conquistas
```

```json
{ "dados": [ { "id": 1, "nome": "Taking Names", "descricao": "Derrote um chefão." }, "..." ] }
```

**Status:** `200`.

### GET /api/conquistas/progresso

Progresso do usuário logado.

```bash
curl -b cookies.txt http://localhost:3000/api/conquistas/progresso
```

```json
{ "dados": { "total": 28, "concluidas": 1, "percentual": 4, "itens": [ { "conquistaId": 3, "concluidaEm": "2026-10-14T17:13:41.244Z" } ] } }
```

**Status:** `200`, `401`.

### PUT /api/conquistas/:id/progresso

Marca a conquista como concluída (idempotente: repetir não gera erro).

```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/conquistas/3/progresso -H "X-CSRF-Token: <token>"
```

**Status:** `204`, `401`, `403` (CSRF), `404`, `422`.

### DELETE /api/conquistas/:id/progresso

Desmarca a conquista.

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/conquistas/3/progresso -H "X-CSRF-Token: <token>"
```

**Status:** `204`, `401`, `403` (CSRF), `404`, `422`.

---

## Usuários (administração)

### GET /api/usuarios

Lista paginada de usuários (somente **admin**). Nunca inclui hash de senha.

**Query string:** `pagina`, `limite` (padrão 20, máx. 50).

```bash
curl -b cookies.txt http://localhost:3000/api/usuarios
```

```json
{
  "dados": [ { "id": 1, "nome": "Administrador", "email": "admin@cuphead.local", "perfil": "admin", "criadoEm": "..." } ],
  "paginacao": { "pagina": 1, "limite": 20, "total": 1, "totalPaginas": 1 }
}
```

**Status:** `200`, `401`, `403`, `422`.

### PATCH /api/usuarios/:id/perfil

Altera o perfil de outro usuário (somente **admin**). Vale imediatamente, inclusive para sessões já abertas.

**Corpo (JSON):** `perfil` (`jogador` | `admin`).

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/usuarios/2/perfil \
  -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" -d '{"perfil":"admin"}'
```

Resposta: `{ "dados": Usuario }` atualizado.

**Status:** `200`, `401`, `403`, `404`, `409` (alterar o próprio perfil), `422`.
