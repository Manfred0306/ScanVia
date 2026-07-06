# 🔐 Obtener la Contraseña de Supabase

## Pasos para obtener tu contraseña de Base de Datos:

### 1. Accede a Supabase
- Ve a [app.supabase.com](https://app.supabase.com)
- Inicia sesión con tu cuenta

### 2. Abre tu proyecto
- Busca y abre el proyecto con ID: **dwcdpkqlutgaqnoxymxl**

### 3. Obtén la contraseña
**Opción A - Dashboard:**
1. Ve a **Settings** (⚙️) en la barra lateral
2. Selecciona **Database**
3. Busca **Connection String** o **Password Reset**
4. Copia la contraseña o el string de conexión completo

**Opción B - Connection String:**
1. Ve a **Settings** → **Database**
2. Selecciona la pestaña **Connection Pooler** o **Direct Connection**
3. Copia el string completo que dice:
   ```
   postgresql://postgres:[PASSWORD]@db.dwcdpkqlutgaqnoxymxl.supabase.co:5432/postgres?sslmode=require
   ```

## 4. Actualiza tu `.env`

Tienes dos opciones:

### **Opción 1: Usar solo la contraseña (RECOMENDADO)**
```env
SUPABASE_PROJECT_ID=dwcdpkqlutgaqnoxymxl
SUPABASE_DB_PASSWORD=TU_CONTRASEÑA_AQUI
PGSSL=true
```

### **Opción 2: Usar el string completo**
```env
SUPABASE_DB_URL=postgresql://postgres:TU_CONTRASEÑA@db.dwcdpkqlutgaqnoxymxl.supabase.co:5432/postgres?sslmode=require
PGSSL=true
```

## 5. Verifica la conexión

```bash
npm run dev
```

Si ves en la consola que conecta a la BD sin errores, ¡está configurado! ✅

## 📝 Variables de Supabase incluidas:

- ✅ **SUPABASE_PROJECT_ID**: dwcdpkqlutgaqnoxymxl
- ✅ **SUPABASE_ANON_KEY**: (ya incluida)
- ❓ **SUPABASE_DB_PASSWORD**: Necesita tu contraseña

## ⚠️ Seguridad

- **NUNCA** commits tu `.env` con contraseñas a GitHub (está en `.gitignore`)
- En **Vercel**, configura estas variables en el panel de Environment Variables
- Cambia la contraseña de BD si fue expuesta
