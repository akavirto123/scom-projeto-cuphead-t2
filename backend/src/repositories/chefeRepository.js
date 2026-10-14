/**
 * Acesso a dados: tabela chefes (entidade principal).
 */
const SELECT_CHEFE = `
  SELECT c.id, c.nome, c.fase, c.estrategia, c.dificuldade,
         c.ilha_id AS "ilhaId", i.nome AS "ilhaNome",
         c.criado_em AS "criadoEm", c.atualizado_em AS "atualizadoEm",
         (SELECT count(*)::int FROM taticas t
           WHERE t.chefe_id = c.id AND t.status = 'aprovada') AS "totalTaticas"
    FROM chefes c
    JOIN ilhas i ON i.id = c.ilha_id`;

/** Escapa curingas do LIKE (% e _) para que sejam tratados como texto. */
export function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}

export function criarChefeRepository(db) {
  return {
    /**
     * Lista com filtros opcionais e paginação. O WHERE é montado só com
     * placeholders; os valores vão no array `parametros`.
     */
    async listar({ ilhaId, busca, limite, deslocamento }) {
      const condicoes = [];
      const parametros = [];

      if (ilhaId !== undefined) {
        parametros.push(ilhaId);
        condicoes.push(`c.ilha_id = $${parametros.length}`);
      }
      if (busca !== undefined) {
        parametros.push(`%${escaparLike(busca)}%`);
        condicoes.push(`(c.nome ILIKE $${parametros.length} OR c.fase ILIKE $${parametros.length})`);
      }
      const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

      const total = await db.query(`SELECT count(*)::int AS total FROM chefes c ${where}`, parametros);
      const lista = await db.query(
        `${SELECT_CHEFE} ${where}
         ORDER BY i.ordem, c.id
         LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
        [...parametros, limite, deslocamento],
      );
      return { itens: lista.rows, total: total.rows[0].total };
    },

    async buscarPorId(id) {
      const { rows } = await db.query(`${SELECT_CHEFE} WHERE c.id = $1`, [id]);
      return rows[0] ?? null;
    },

    async existe(id) {
      const { rowCount } = await db.query('SELECT 1 FROM chefes WHERE id = $1', [id]);
      return rowCount > 0;
    },

    async existeNome(nome, ignorarId = null) {
      const { rowCount } = await db.query(
        'SELECT 1 FROM chefes WHERE lower(nome) = lower($1) AND ($2::int IS NULL OR id <> $2)',
        [nome, ignorarId],
      );
      return rowCount > 0;
    },

    async criar({ nome, fase, ilhaId, estrategia, dificuldade, criadoPor }) {
      const { rows } = await db.query(
        `INSERT INTO chefes (nome, fase, ilha_id, estrategia, dificuldade, criado_por)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [nome, fase, ilhaId, estrategia, dificuldade, criadoPor],
      );
      return this.buscarPorId(rows[0].id);
    },

    async atualizar(id, { nome, fase, ilhaId, estrategia, dificuldade }) {
      const { rowCount } = await db.query(
        `UPDATE chefes
            SET nome = $2, fase = $3, ilha_id = $4, estrategia = $5, dificuldade = $6
          WHERE id = $1`,
        [id, nome, fase, ilhaId, estrategia, dificuldade],
      );
      return rowCount ? this.buscarPorId(id) : null;
    },

    async excluir(id) {
      const { rowCount } = await db.query('DELETE FROM chefes WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}
