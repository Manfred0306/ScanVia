const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const projectId = process.env.SUPABASE_PROJECT_ID;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!projectId || !anonKey) {
      throw new Error('Faltan SUPABASE_PROJECT_ID o SUPABASE_ANON_KEY en .env');
    }

    const url = `https://${projectId}.supabase.co`;
    supabase = createClient(url, anonKey);
  }

  return supabase;
}

async function initializeDatabase() {
  try {
    const client = getSupabaseClient();
    // Test connection
    const { error } = await client.from('usuarios').select('id', { count: 'exact', head: true });
    
    if (error) {
      console.warn('Conexión a Supabase con advertencia:', error.message);
    } else {
      console.log('✅ Conexión a Supabase exitosa');
    }
    
    return true;
  } catch (error) {
    console.error('Error inicializando base de datos:', error.message);
    throw error;
  }
}

async function createUser(usuario, contactos) {
  const client = getSupabaseClient();

  try {
    // Insertar usuario
    const { data: userData, error: userError } = await client
      .from('usuarios')
      .insert([
        {
          id: usuario.id,
          cedula: usuario.cedula,
          nombre: usuario.nombre,
          tipo_sangre: usuario.tipoSangre || null,
          alergias: usuario.alergias || null,
          medicamentos: usuario.medicamentos || null,
        },
      ])
      .select()
      .single();

    if (userError) {
      throw new Error(`Error al crear usuario: ${userError.message}`);
    }

    // Insertar contactos
    const contactosToInsert = contactos.map((contacto, index) => ({
      usuario_id: usuario.id,
      nombre: contacto.nombre,
      relacion: contacto.relacion,
      telefono: contacto.telefono,
      orden: index,
    }));

    const { error: contactosError } = await client
      .from('contactos')
      .insert(contactosToInsert);

    if (contactosError) {
      throw new Error(`Error al crear contactos: ${contactosError.message}`);
    }

    return {
      createdAt: userData.created_at,
    };
  } catch (error) {
    throw error;
  }
}

async function listUsers() {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false })
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`Error al listar usuarios: ${error.message}`);
    }

    return (data || []).map((usuario) => ({
      id: usuario.id,
      cedula: usuario.cedula,
      nombre: usuario.nombre,
      tipoSangre: usuario.tipo_sangre,
      alergias: usuario.alergias,
      medicamentos: usuario.medicamentos,
      createdAt: usuario.created_at,
    }));
  } catch (error) {
    throw error;
  }
}

async function getUserById(id) {
  const client = getSupabaseClient();

  try {
    // Obtener usuario
    const { data: userData, error: userError } = await client
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return null; // No encontrado
      }
      throw new Error(`Error al obtener usuario: ${userError.message}`);
    }

    if (!userData) {
      return null;
    }

    // Obtener contactos
    const { data: contactosData, error: contactosError } = await client
      .from('contactos')
      .select('nombre, relacion, telefono')
      .eq('usuario_id', id)
      .order('orden', { ascending: true });

    if (contactosError) {
      throw new Error(`Error al obtener contactos: ${contactosError.message}`);
    }

    return {
      id: userData.id,
      cedula: userData.cedula,
      nombre: userData.nombre,
      tipoSangre: userData.tipo_sangre,
      alergias: userData.alergias,
      medicamentos: userData.medicamentos,
      createdAt: userData.created_at,
      contactos: contactosData || [],
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  createUser,
  listUsers,
  getUserById,
};