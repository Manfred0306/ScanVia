const sql = require('mssql/msnodesqlv8');

const serverName = 'LAPTOP-10U72MBH\\SQLEXPRESS';
const databaseName = 'scanvia_local';

function buildConnectionString(database) {
  return [
    'Driver={SQL Server}',
    `Server=${serverName}`,
    `Database=${database}`,
    'Trusted_Connection=Yes',
    'TrustServerCertificate=Yes',
  ].join(';') + ';';
}

let poolPromise;

async function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool({
      connectionString: buildConnectionString(databaseName),
    }).connect();
  }

  return poolPromise;
}

async function initializeDatabase() {
  const masterPool = new sql.ConnectionPool({
    connectionString: buildConnectionString('master'),
  });

  await masterPool.connect();

  try {
    await masterPool.request().query(`
      IF DB_ID(N'${databaseName}') IS NULL
      BEGIN
        CREATE DATABASE [${databaseName}];
      END
    `);
  } finally {
    await masterPool.close();
  }

  const pool = await getPool();

  await pool.request().query(`
    IF OBJECT_ID(N'dbo.usuarios', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.usuarios (
        id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        cedula NVARCHAR(40) NOT NULL,
        nombre NVARCHAR(120) NOT NULL,
        tipo_sangre NVARCHAR(10) NULL,
        alergias NVARCHAR(MAX) NULL,
        medicamentos NVARCHAR(MAX) NULL,
        created_at DATETIME2(0) NOT NULL CONSTRAINT DF_usuarios_created_at DEFAULT SYSDATETIME()
      );
    END;
  `);

  await pool.request().query(`
    IF OBJECT_ID(N'dbo.contactos', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.contactos (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        nombre NVARCHAR(120) NOT NULL,
        relacion NVARCHAR(120) NOT NULL,
        telefono NVARCHAR(40) NOT NULL,
        orden INT NOT NULL CONSTRAINT DF_contactos_orden DEFAULT 0,
        CONSTRAINT FK_contactos_usuario
          FOREIGN KEY (usuario_id)
          REFERENCES dbo.usuarios (id)
          ON DELETE CASCADE
      );
    END;
  `);

  return pool;
}

module.exports = {
  sql,
  getPool,
  initializeDatabase,
};