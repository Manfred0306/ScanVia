const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function initializeDatabase() {
  const projectId = process.env.SUPABASE_PROJECT_ID;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!projectId || !anonKey) {
    console.error('❌ Faltan SUPABASE_PROJECT_ID o SUPABASE_ANON_KEY en .env');
    process.exit(1);
  }

  const url = `https://${projectId}.supabase.co`;
  const supabase = createClient(url, anonKey);

  try {
    console.log('⏳ Conectando a Supabase...');
    const { data, error } = await supabase.from('usuarios').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('⚠️  La conexión funcionó pero las tablas pueden no existir aún');
      console.log('   (Esto es normal si es la primera vez)');
    } else {
      console.log('✅ Conexión exitosa a Supabase');
    }

    console.log('\n✅ Supabase está configurado correctamente');
    console.log('📝 Las tablas "usuarios" y "contactos" deben existir en tu proyecto Supabase');
    console.log('   Si aún no existen, puedes crearlas desde el SQL Editor de Supabase');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
}

initializeDatabase();
