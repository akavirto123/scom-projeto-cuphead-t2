/**
 * Acesso a dados: conquistas e progresso do usuário (usuario_conquistas).
 */
export function criarConquistaRepository(db) {
  return {
    async listar() {
      const { rows } = await db.query('SELECT id, nome, descricao FROM conquistas ORDER BY ordem');
      return rows;
    },

    async existe(id) {
      const { rowCount } = await db.query('SELECT 1 FROM conquistas WHERE id = $1', [id]);
      return rowCount > 0;
    },

    async listarConcluidas(usuarioId) {
      const { rows } = await db.query(
        `SELECT conquista_id AS "conquistaId", concluida_em AS "concluidaEm"
           FROM usuario_conquistas WHERE usuario_id = $1 ORDER BY conquista_id`,
        [usuarioId],
      );
      return rows;
    },

    /** Idempotente: marcar duas vezes não gera erro. */
    async marcar(usuarioId, conquistaId) {
      await db.query(
        `INSERT INTO usuario_conquistas (usuario_id, conquista_id) VALUES ($1, $2)
         ON CONFLICT (usuario_id, conquista_id) DO NOTHING`,
        [usuarioId, conquistaId],
      );
    },

    async desmarcar(usuarioId, conquistaId) {
      await db.query('DELETE FROM usuario_conquistas WHERE usuario_id = $1 AND conquista_id = $2', [usuarioId, conquistaId]);
    },
  };
}
