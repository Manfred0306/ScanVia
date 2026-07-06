const { Pool } = require('pg');

let poolPromise;

async function getPoolWithoutInit() {
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Falta la variable de entorno SUPABASE_DB_URL o DATABASE_URL');
  }

  if (!poolPromise) {
    poolPromise = new Pool({
      connectionString,
      ssl:
        process.env.PGSSL === 'false'
          ? false
          : {
              rejectUnauthorized: false,
            },
    });
  }

  return poolPromise;
}

async function getPool() {
  return poolPromise;
}

async function initializeDatabase() {
  return getPoolWithoutInit();
}

async function createUser(usuario, contactos) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `
        INSERT INTO usuarios (
          id,
          cedula,
          nombre,
          tipo_sangre,
          alergias,
          medicamentos
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING created_at
      `,
      [
        usuario.id,
        usuario.cedula,
        usuario.nombre,
        usuario.tipoSangre || null,
        usuario.alergias || null,
        usuario.medicamentos || null,
      ]
    );

    for (let index = 0; index < contactos.length; index += 1) {
      const contacto = contactos[index];

      await client.query(
        `
          INSERT INTO contactos (
            usuario_id,
            nombre,
            relacion,
            telefono,
            orden
          ) VALUES ($1, $2, $3, $4, $5)
        `,
        [usuario.id, contacto.nombre, contacto.relacion, contacto.telefono, index]
      );
    }

    await client.query('COMMIT');

    const createdAt = userResult.rows[0] ? userResult.rows[0].created_at : new Date().toISOString();

    return {
      createdAt,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listUsers() {
  const pool = await getPool();
  const result = await pool.query(`
    SELECT
      id::text AS id,
      cedula,
      nombre,
      tipo_sangre AS "tipoSangre",
      alergias,
      medicamentos,
      created_at AS "createdAt"
    FROM usuarios
    ORDER BY created_at DESC, nombre ASC
  `);

  return result.rows;
}

async function getUserById(id) {
  const pool = await getPool();
  const result = await pool.query(
    `
      SELECT
        id::text AS id,
        cedula,
        nombre,
        tipo_sangre AS "tipoSangre",
        alergias,
        medicamentos,
        created_at AS "createdAt"
      FROM usuarios
      WHERE id = $1
    `,
    [id]
  );

  if (!result.rows.length) {
    return null;
  }

  const contactosResult = await pool.query(
    `
      SELECT
        nombre,
        relacion,
        telefono
      FROM contactos
      WHERE usuario_id = $1
      ORDER BY orden ASC, id ASC
    `,
    [id]
  );

  return {
    ...result.rows[0],
    contactos: contactosResult.rows,
  };
}

module.exports = {
  getPool,
  initializeDatabase,
  createUser,
  listUsers,
  getUserById,
};