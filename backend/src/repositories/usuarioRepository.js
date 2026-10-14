/**
 * Acesso a dados: tabela usuarios.
 * Todas as consultas usam parâmetros posicionais ($1, $2...).
 */
const COLUNAS_PUBLICAS = 'id, nome, email, perfil, criado_em AS "criadoEm"';

export function criarUsuarioRepository(db) {
  return {
    async buscarPorId(id) {
      const { rows } = await db.query(`SELECT ${COLUNAS_PUBLICAS} FROM usuarios WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    /** Inclui o hash da senha: uso exclusivo do fluxo de login. */
    async buscarCredenciaisPorEmail(email) {
      const { rows } = await db.query(
        `SELECT ${COLUNAS_PUBLICAS}, senha_hash AS "senhaHash" FROM usuarios WHERE email = $1`,
        [email],
      );
      return rows[0] ?? null;
    },

    async existeEmail(email) {
      const { rowCount } = await db.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
      return rowCount > 0;
    },

    async criar({ nome, email, senhaHash, perfil = 'jogador' }) {
      const { rows } = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, perfil)
         VALUES ($1, $2, $3, $4)
         RETURNING ${COLUNAS_PUBLICAS}`,
        [nome, email, senhaHash, perfil],
      );
      return rows[0];
    },

    async listar({ limite, deslocamento }) {
      const [lista, total] = await Promise.all([
        db.query(`SELECT ${COLUNAS_PUBLICAS} FROM usuarios ORDER BY id LIMIT $1 OFFSET $2`, [limite, deslocamento]),
        db.query('SELECT count(*)::int AS total FROM usuarios'),
      ]);
      return { itens: lista.rows, total: total.rows[0].total };
    },

    async alterarPerfil(id, perfil) {
      const { rows } = await db.query(
        `UPDATE usuarios SET perfil = $2 WHERE id = $1 RETURNING ${COLUNAS_PUBLICAS}`,
        [id, perfil],
      );
      return rows[0] ?? null;
    },

    /** Cria ou promove um administrador (usado pelo script criar-admin). */
    async salvarAdministrador({ nome, email, senhaHash }) {
      const { rows } = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, perfil)
         VALUES ($1, $2, $3, 'admin')
         ON CONFLICT (email) DO UPDATE
           SET nome = EXCLUDED.nome, senha_hash = EXCLUDED.senha_hash, perfil = 'admin'
         RETURNING ${COLUNAS_PUBLICAS}`,
        [nome, email, senhaHash],
      );
      return rows[0];
    },
  };
}
