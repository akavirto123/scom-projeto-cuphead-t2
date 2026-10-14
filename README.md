# Cuphead Boss Guide

**Trabalho Individual II — Disciplina SCOM**
**Autor:** Vitor Correia Mendes
**Curso:** Engenharia de Controle e Automação — UNESP Sorocaba (2026)

Guia do jogo *Cuphead* com estratégias para os chefes, táticas enviadas pela
comunidade e checklist de conquistas. O Trabalho I era uma interface estática
(HTML5 + CSS3, tag `v1.0`); no Trabalho II o sistema ganhou backend, banco de
dados, autenticação, perfis de acesso, testes e documentação (tag `v2.0`).

| | |
|---|---|
| Frontend | HTML5, CSS3 e JavaScript (módulos ES), sem frameworks; fontes vintage embutidas |
| Backend | Node.js 22 + Express 4, arquitetura em camadas |
| Banco | PostgreSQL 12+ (driver `pg`, consultas parametrizadas) |
| Autenticação | Sessão no servidor + bcrypt + token CSRF |
| Testes | `node:test` + supertest (56 testes) |

Documentação: [API](docs/API.md) · [Arquitetura](docs/ARQUITETURA.md) ·
[Checklist de requisitos](docs/CHECKLIST.md) · [Relatório (PDF)](docs/relatorio/relatorio.pdf)

---

## Como executar localmente

### 1. Pré-requisitos

- **Node.js 22 LTS** ou superior — <https://nodejs.org>
- **PostgreSQL 12 ou superior** (testado no 16) — <https://www.postgresql.org/download/>
  (no Windows o instalador já traz o `psql` e o pgAdmin)
- Git

### 2. Criar o usuário e os bancos no PostgreSQL

Abra o **SQL Shell (psql)** (ou o terminal com `psql -U postgres`) e execute,
trocando a senha por uma sua:

```sql
CREATE ROLE cuphead_app LOGIN PASSWORD 'escolha_uma_senha';
CREATE DATABASE cuphead_guide OWNER cuphead_app;
CREATE DATABASE cuphead_guide_test OWNER cuphead_app;
```

O segundo banco é usado apenas pelos testes automatizados (ele é apagado e
recriado a cada execução).

### 3. Configurar o backend

```bash
git clone https://github.com/akavirto123/scom-projeto-cuphead.git
cd scom-projeto-cuphead/backend
npm install
cp .env.example .env        # no Windows (cmd): copy .env.example .env
```

Edite o `backend/.env`:

- `DB_PASSWORD`: a senha escolhida no passo 2;
- `SESSION_SECRET`: um valor aleatório. Para gerar um:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_EMAIL` e `ADMIN_SENHA`: credenciais do administrador
  (senha com 8+ caracteres, letras e números).

### 4. Criar as tabelas e o administrador

```bash
npm run db:migrar       # cria as tabelas e importa chefes/conquistas
npm run criar-admin     # cria a conta admin com os dados do .env
```

Alternativa sem Node: executar `backend/database/script_completo.sql` no psql ou
no pgAdmin (`psql -U cuphead_app -d cuphead_guide -f database/script_completo.sql`).

### 5. Iniciar

```bash
npm start               # ou: npm run dev (reinicia ao salvar arquivos)
```

Acesse **<http://localhost:3000>**. Crie uma conta em *Entrar* para usar como
jogador, ou entre com o administrador do `.env` para ver o painel *Admin*.

---

## Comandos

| Comando (dentro de `backend/`) | O que faz |
|---|---|
| `npm start` | Sobe o servidor em `http://localhost:3000` |
| `npm run dev` | Sobe o servidor e reinicia a cada alteração |
| `npm run db:migrar` | Aplica migrações pendentes |
| `npm run db:resetar` | Apaga e recria todas as tabelas (somente desenvolvimento) |
| `npm run db:script` | Regera `database/script_completo.sql` a partir das migrações |
| `npm run criar-admin` | Cria/atualiza o administrador definido no `.env` |
| `npm test` | Roda os 56 testes (unitários + integração + segurança) |
| `npm run test:unit` | Somente testes unitários (não precisam de banco) |
| `npm run test:integracao` | Somente testes com a API e o banco de testes |
| `npm run test:relatorio` | Testes com saída detalhada (usada no relatório) |
| `npm run bench` | Mede desempenho dos endpoints com autocannon |

## Estrutura

```
frontend/   Interface (HTML/CSS do T1 + JavaScript que consome a API)
backend/    API Express: config, middlewares, routes, controllers,
            services, repositories, migrações, testes
docs/       Documentação da API, arquitetura, checklist, evidências e relatório
```

Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Fluxo de Git

- `main`: versões entregues (tags `v1.0` = Trabalho I, `v2.0` = Trabalho II)
- `develop`: integração
- `feature/*`, `test/*`, `docs/*`: uma branch por etapa, integrada em `develop`
  com merge `--no-ff` para manter o histórico visível
- Mensagens no padrão *Conventional Commits* (`feat:`, `fix:`, `test:`, `docs:`, `chore:`)

## Uso de IA generativa

Este trabalho foi desenvolvido com apoio de IA generativa (Claude, da
Anthropic). A seção 13 do relatório descreve a ferramenta, quais partes do
projeto foram produzidas com ela, os problemas encontrados na revisão e as
limitações do uso.
