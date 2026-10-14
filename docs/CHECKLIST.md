# Checklist de requisitos — Trabalho Individual II

Legenda: **[X]** atendido · onde verificar.

## Requisitos obrigatórios

| # | Requisito | Status | Onde verificar |
|---|---|:---:|---|
| 1 | Separação interface / lógica de aplicação / acesso a dados | [X] | `frontend/`, `backend/src/services`, `backend/src/repositories` |
| 1 | Arquitetura documentada | [X] | `docs/ARQUITETURA.md`, relatório seção 4 |
| 2 | Entidade principal persistente (chefes) | [X] | `001_criar_tabelas.sql`, `chefeRepository.js` |
| 2 | CRUD compatível com o domínio | [X] | `POST/GET/PUT/DELETE /api/chefes`, táticas, conquistas |
| 2 | Consultas parametrizadas | [X] | Todos os arquivos de `src/repositories/` (`$1, $2...`) |
| 2 | Constraints PK, FK, UNIQUE, NOT NULL (+ CHECK) | [X] | `001_criar_tabelas.sql` |
| 2 | Script de criação do banco | [X] | `backend/database/script_completo.sql` |
| 3 | Autenticação por sessão segura | [X] | `middlewares/sessao.js` |
| 3 | Hash seguro de senha (bcrypt) | [X] | `services/hasher.js`, teste `[Senhas]` |
| 3 | Logout funcional | [X] | `POST /api/auth/logout`, teste `[Sessão inválida]` |
| 3 | Proteção de rotas autenticadas | [X] | `middlewares/autorizacao.js` |
| 4 | Dois ou mais perfis (visitante, jogador, admin) | [X] | `domain/permissoes.js` |
| 4 | Matriz de permissões no relatório | [X] | `docs/ARQUITETURA.md`, relatório seção 6 |
| 5 | Validação de tipos e tamanhos no backend | [X] | `utils/validacao.js`, `validators/` |
| 5 | Sanitização | [X] | `sanitizarTexto()` (controles, Unicode, espaços) |
| 5 | Mensagens de erro estruturadas | [X] | `erro.detalhes[{campo, mensagem}]` |
| 6 | Proteção contra SQL Injection | [X] | Parâmetros `$n` + validação; testes `[SQLi]` |
| 6 | Proteção contra XSS refletido | [X] | API só JSON + `nosniff`, CSP, `textContent` no frontend; teste `[XSS]` |
| 6 | Proteção CSRF | [X] | `middlewares/csrf.js` + `SameSite=Strict`; teste `[CSRF]` |
| 6 | Bloqueio de acesso não autorizado | [X] | Testes `[Acesso sem login]` e `[Perfil insuficiente]` |
| 6 | Evidências dos testes | [X] | `docs/evidencias/`, relatório seção 10 |
| 7 | Respostas de erro com status, mensagem e detalhes só em dev | [X] | `middlewares/tratadorErros.js`; `erro_interno_dev.txt` |
| 8 | Documentação de todos os endpoints | [X] | `docs/API.md` (25 endpoints) |
| 9 | ≥ 5 testes automatizados com casos válidos e inválidos | [X] | 56 testes; `docs/evidencias/testes_automatizados.txt` |
| 10 | Logs com timestamp: login, falha, criação, erro interno | [X] | `config/logger.js`; `docs/evidencias/logs_amostra.txt` |

## Métricas de avaliação (A–G)

| Item | Status | Observação |
|---|:---:|---|
| A. Separação frontend/backend | [X] | Pastas `frontend/` e `backend/` |
| A. Diretórios organizados | [X] | Uma pasta por camada |
| A. Camada de acesso a dados isolada | [X] | `src/repositories/` |
| A. Configuração separada do código | [X] | `src/config/env.js` + `.env` |
| A. Variáveis sensíveis fora do código | [X] | `.env` no `.gitignore`; só `.env.example` versionado |
| A. Script SQL | [X] | `database/script_completo.sql` |
| A. README de execução | [X] | `README.md` |
| A. Documentação da arquitetura | [X] | `docs/ARQUITETURA.md` |
| A. Nomenclatura consistente | [X] | Português, camelCase no JS, snake_case no SQL |
| A. Sem arquivos temporários | [X] | `.gitignore` cobre `node_modules`, logs, `.env` |
| A. Sem código morto evidente | [X] | — |
| A. Módulos consistentes | [X] | ES Modules em todo o backend e frontend |
| A. Tratamento centralizado de erros | [X] | `tratadorErros.js` + `AppError` |
| A. Reutilização de componentes | [X] | `validar()`, `rotaAssincrona`, `responder`, `el()`, `api.js` |
| A. Estrutura compatível com o padrão | [X] | Camadas descritas e respeitadas |
| B. PK em todas as tabelas | [X] | 8 tabelas, todas com `pk_*` |
| B. FKs corretas | [X] | 7 FKs com `ON DELETE` adequado |
| B. Constraints adequadas | [X] | UNIQUE, NOT NULL e CHECK |
| B. Tipos apropriados | [X] | `SMALLINT`, `VARCHAR(n)`, `TIMESTAMPTZ`, identity |
| B. Índices relevantes | [X] | 6 índices além das PK/UNIQUE |
| B. Script executável sem erros | [X] | Testado com `psql -v ON_ERROR_STOP=1` |
| C1. Prepared statements | [X] | — |
| C1. Escaping de saída HTML | [X] | `dom.js` (`textContent`), CSP |
| C1. Proteção CSRF | [X] | — |
| C1. Controle de acesso efetivo | [X] | — |
| C2. Testes de segurança documentados | [X] | 7 testes manuais + 14 automatizados |
| D. Hash, login, logout, rotas, perfis | [X] | — |
| E. Métodos HTTP, status, JSON, documentação | [X] | — |
| F. ≥5 testes, inválidos, evidência | [X] | — |
| G. Commits significativos e padronizados | [X] | Conventional Commits |
| G. Evolução incremental | [X] | `git log --oneline --graph` |
| G. Branches e tags | [X] | `develop`, `feature/*`, tags `v1.0` e `v2.0` |

## Boas práticas opcionais

| Prática | Status | Onde |
|---|:---:|---|
| `.env` para configuração | [X] | `backend/.env.example` |
| Migrações de banco | [X] | `database/migrations/` + `npm run db:migrar` |
| Paginação de resultados | [X] | `?pagina=&limite=` em chefes, táticas e usuários |
| Rate limiting simples | [X] | Login (5 falhas/15 min) e API (300 req/min) |
| Testes de integração automatizados | [X] | `tests/integracao/` (22 testes) |

## Entrega

| Item | Status |
|---|:---:|
| Código-fonte completo | [X] |
| Script SQL | [X] |
| Relatório PDF | [X] |
| Link do repositório Git | [X] |
| Vídeo de demonstração | [ ] gravar (roteiro em `docs/ROTEIRO_VIDEO.md`) |
