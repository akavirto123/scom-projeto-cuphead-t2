/**
 * Acesso a dados: tabela taticas (sugestões da comunidade).
 */
const SELECT_TATICA = `
  SELECT t.id, t.conteudo, t.status,
         t.chefe_id AS "chefeId", c.nome AS "chefeNome",
         t.usuario_id AS "usuarioId", u.nome AS "autorNome",
         t.criado_em AS "criadoEm", t.atualizado_em AS "atualizadoEm"
    FROM taticas t
    JOIN chefes c   ON c.id = t.chefe_id
    JOIN usuarios u ON u.id = t.usuario_id`;

export function criarTaticaRepository(db) {
  return {
    async buscarPorId(id) {
      const { rows } = await db.query(`${SELECT_TATICA} WHERE t.id = $1`, [id]);
      return rows[0] ?? null;
    },

    async listarAprovadasDoChefe(chefeId) {
      const { rows } = await db.query(
        `${SELECT_TATICA} WHERE t.chefe_id = $1 AND t.status = 'aprovada' ORDER BY t.criado_em DESC`,
        [chefeId],
      );
      return rows;
    },

    async listarDoUsuario(usuarioId) {
      const { rows } = await db.query(
        `${SELECT_TATICA} WHERE t.usuario_id = $1 ORDER BY t.criado_em DESC`,
        [usuarioId],
      );
      return rows;
    },

    async listarPorStatus({ status, limite, deslocamento }) {
      const filtro = status ? 'WHERE t.status = $1' : '';
      const parametros = status ? [status] : [];
      const [lista, total] = await Promise.all([
        db.query(
          `${SELECT_TATICA} ${filtro} ORDER BY t.criado_em ASC
           LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
          [...parametros, limite, deslocamento],
        ),
        db.query(`SELECT count(*)::int AS total FROM taticas t ${filtro}`, parametros),
      ]);
      return { itens: lista.rows, total: total.rows[0].total };
    },

    async criar({ chefeId, usuarioId, conteudo }) {
      const { rows } = await db.query(
        'INSERT INTO taticas (chefe_id, usuario_id, conteudo) VALUES ($1, $2, $3) RETURNING id',
        [chefeId, usuarioId, conteudo],
      );
      return this.buscarPorId(rows[0].id);
    },

    async atualizarConteudo(id, conteudo) {
      await db.query('UPDATE taticas SET conteudo = $2 WHERE id = $1', [id, conteudo]);
      return this.buscarPorId(id);
    },

    async moderar(id, { status, moderadorId }) {
      await db.query('UPDATE taticas SET status = $2, moderado_por = $3 WHERE id = $1', [id, status, moderadorId]);
      return this.buscarPorId(id);
    },

    async excluir(id) {
      const { rowCount } = await db.query('DELETE FROM taticas WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}
