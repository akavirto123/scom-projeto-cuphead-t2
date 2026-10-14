/** Acesso a dados: tabela ilhas. */
export function criarIlhaRepository(db) {
  return {
    async listar() {
      const { rows } = await db.query('SELECT id, nome, ordem FROM ilhas ORDER BY ordem');
      return rows;
    },

    async existe(id) {
      const { rowCount } = await db.query('SELECT 1 FROM ilhas WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}
