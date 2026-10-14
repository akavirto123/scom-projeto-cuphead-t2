-- =====================================================================
-- Migração 001 - Criação das tabelas do Cuphead Boss Guide
-- SGBD: PostgreSQL 12+ (testado na versão 16)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Usuários e perfis de acesso
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id          INTEGER GENERATED ALWAYS AS IDENTITY,
    nome        VARCHAR(60)  NOT NULL,
    email       VARCHAR(254) NOT NULL,
    senha_hash  VARCHAR(72)  NOT NULL,           -- hash bcrypt (60 caracteres)
    perfil      VARCHAR(10)  NOT NULL DEFAULT 'jogador',
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT pk_usuarios PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT ck_usuarios_perfil CHECK (perfil IN ('jogador', 'admin')),
    CONSTRAINT ck_usuarios_email_minusculo CHECK (email = lower(email)),
    CONSTRAINT ck_usuarios_nome_tamanho CHECK (char_length(nome) BETWEEN 2 AND 60)
);

-- ---------------------------------------------------------------------
-- Ilhas (mundos) do jogo
-- ---------------------------------------------------------------------
CREATE TABLE ilhas (
    id     SMALLINT GENERATED ALWAYS AS IDENTITY,
    nome   VARCHAR(40) NOT NULL,
    ordem  SMALLINT    NOT NULL,

    CONSTRAINT pk_ilhas PRIMARY KEY (id),
    CONSTRAINT uq_ilhas_nome UNIQUE (nome),
    CONSTRAINT uq_ilhas_ordem UNIQUE (ordem),
    CONSTRAINT ck_ilhas_ordem_positiva CHECK (ordem > 0)
);

-- ---------------------------------------------------------------------
-- Chefes (entidade principal)
-- ---------------------------------------------------------------------
CREATE TABLE chefes (
    id             INTEGER GENERATED ALWAYS AS IDENTITY,
    nome           VARCHAR(60)  NOT NULL,
    fase           VARCHAR(80)  NOT NULL,          -- nome da fase/nível no jogo
    ilha_id        SMALLINT     NOT NULL,
    estrategia     VARCHAR(1000) NOT NULL,
    dificuldade    SMALLINT     NOT NULL,
    criado_por     INTEGER,
    criado_em      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT pk_chefes PRIMARY KEY (id),
    CONSTRAINT uq_chefes_nome UNIQUE (nome),
    CONSTRAINT fk_chefes_ilha FOREIGN KEY (ilha_id)
        REFERENCES ilhas (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_chefes_criado_por FOREIGN KEY (criado_por)
        REFERENCES usuarios (id) ON DELETE SET NULL,
    CONSTRAINT ck_chefes_dificuldade CHECK (dificuldade BETWEEN 1 AND 5),
    CONSTRAINT ck_chefes_estrategia_tamanho CHECK (char_length(estrategia) BETWEEN 20 AND 1000)
);

-- Listagem filtrada por ilha (consulta mais frequente do site)
CREATE INDEX idx_chefes_ilha_id ON chefes (ilha_id);
-- Busca por nome sem diferenciar maiúsculas/minúsculas
CREATE INDEX idx_chefes_nome_lower ON chefes (lower(nome));

-- ---------------------------------------------------------------------
-- Táticas sugeridas pela comunidade (moderadas pelo administrador)
-- ---------------------------------------------------------------------
CREATE TABLE taticas (
    id             INTEGER GENERATED ALWAYS AS IDENTITY,
    chefe_id       INTEGER      NOT NULL,
    usuario_id     INTEGER      NOT NULL,
    conteudo       VARCHAR(1000) NOT NULL,
    status         VARCHAR(10)  NOT NULL DEFAULT 'pendente',
    moderado_por   INTEGER,
    criado_em      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT pk_taticas PRIMARY KEY (id),
    CONSTRAINT fk_taticas_chefe FOREIGN KEY (chefe_id)
        REFERENCES chefes (id) ON DELETE CASCADE,
    CONSTRAINT fk_taticas_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_taticas_moderado_por FOREIGN KEY (moderado_por)
        REFERENCES usuarios (id) ON DELETE SET NULL,
    CONSTRAINT ck_taticas_status CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
    CONSTRAINT ck_taticas_conteudo_tamanho CHECK (char_length(conteudo) BETWEEN 10 AND 1000)
);

-- Táticas aprovadas de um chefe (página pública)
CREATE INDEX idx_taticas_chefe_status ON taticas (chefe_id, status);
-- "Minhas táticas"
CREATE INDEX idx_taticas_usuario ON taticas (usuario_id);
-- Fila de moderação ordenada por data
CREATE INDEX idx_taticas_status_criado_em ON taticas (status, criado_em);

-- ---------------------------------------------------------------------
-- Conquistas do jogo e progresso de cada usuário
-- ---------------------------------------------------------------------
CREATE TABLE conquistas (
    id         SMALLINT GENERATED ALWAYS AS IDENTITY,
    nome       VARCHAR(60)  NOT NULL,
    descricao  VARCHAR(200) NOT NULL,
    ordem      SMALLINT     NOT NULL,

    CONSTRAINT pk_conquistas PRIMARY KEY (id),
    CONSTRAINT uq_conquistas_nome UNIQUE (nome),
    CONSTRAINT uq_conquistas_ordem UNIQUE (ordem)
);

CREATE TABLE usuario_conquistas (
    usuario_id    INTEGER     NOT NULL,
    conquista_id  SMALLINT    NOT NULL,
    concluida_em  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_usuario_conquistas PRIMARY KEY (usuario_id, conquista_id),
    CONSTRAINT fk_usuario_conquistas_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_conquistas_conquista FOREIGN KEY (conquista_id)
        REFERENCES conquistas (id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Sessões de login (usada pelo connect-pg-simple)
-- ---------------------------------------------------------------------
CREATE TABLE sessoes (
    sid     VARCHAR      NOT NULL,
    sess    JSON         NOT NULL,
    expire  TIMESTAMP(6) NOT NULL,

    CONSTRAINT pk_sessoes PRIMARY KEY (sid)
);

-- Limpeza periódica de sessões expiradas
CREATE INDEX idx_sessoes_expire ON sessoes (expire);

-- ---------------------------------------------------------------------
-- Atualiza "atualizado_em" automaticamente em todo UPDATE
-- ---------------------------------------------------------------------
CREATE FUNCTION definir_atualizado_em() RETURNS trigger AS $$
BEGIN
    NEW.atualizado_em := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chefes_atualizado_em
    BEFORE UPDATE ON chefes
    FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

CREATE TRIGGER trg_taticas_atualizado_em
    BEFORE UPDATE ON taticas
    FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();
