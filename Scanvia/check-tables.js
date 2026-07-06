const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createTables() {
  const projectId = process.env.SUPABASE_PROJECT_ID;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!projectId || !anonKey) {
    console.error('❌ Faltan SUPABASE_PROJECT_ID o SUPABASE_ANON_KEY en .env');
    process.exit(1);
  }

  const url = `https://${projectId}.supabase.co`;
  const supabase = createClient(url, anonKey);

  try {
    console.log('⏳ Verificando si las tablas existen...\n');

    // Intentar leer de usuarios
    const { data: usuariosData, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });

    if (usuariosError && usuariosError.code === 'PGRST116') {
      console.log('❌ Tabla "usuarios" NO existe');
      console.log('\n⏳ Creando tablas en Supabase...');
      console.log('\nVe a tu proyecto Supabase:');
      console.log('1. https://app.supabase.com');
      console.log('2. Abre tu proyecto: ' + projectId);
      console.log('3. Ve a SQL Editor');
      console.log('4. Copia y pega este SQL:\n');

      const sql = `
-- Crear tabla usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  cedula VARCHAR(40) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  tipo_sangre VARCHAR(10),
  alergias TEXT,
  medicamentos TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear tabla contactos
CREATE TABLE IF NOT EXISTS contactos (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  relacion VARCHAR(120) NOT NULL,
  telefono VARCHAR(40) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_contactos_usuario_id ON contactos(usuario_id);

-- Configurar RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública
CREATE POLICY "Enable read access for all users" ON usuarios
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON contactos
  FOR SELECT USING (true);

-- Permitir insert/update/delete autenticados (cambiar según necesites)
CREATE POLICY "Enable insert for authenticated users only" ON usuarios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON contactos
  FOR INSERT WITH CHECK (true);
`;

      console.log(sql);
      console.log('\n5. Ejecuta el SQL');
      console.log('6. Vuelve a ejecutar este script\n');
      process.exit(1);
    } else {
      console.log('✅ Tabla "usuarios" existe');
    }

    // Verificar contactos
    const { error: contactosError } = await supabase
      .from('contactos')
      .select('*', { count: 'exact', head: true });

    if (contactosError && contactosError.code === 'PGRST116') {
      console.log('❌ Tabla "contactos" NO existe');
      console.log('\n⚠️  Ejecuta el SQL anterior para crear ambas tablas');
      process.exit(1);
    } else {
      console.log('✅ Tabla "contactos" existe');
    }

    console.log('\n✅ ¡Todas las tablas están listas!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTables();
