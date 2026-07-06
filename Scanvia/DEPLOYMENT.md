# Despliegue en Vercel - ScanVia

## 📋 Requisitos Previos

- Cuenta en [Vercel](https://vercel.com)
- Repositorio en GitHub (ya tienes uno)
- Variables de entorno configuradas

## 🚀 Pasos de Despliegue

### 1. Prepara las Variables de Entorno en Vercel

1. Ve a [dashboard.vercel.com](https://dashboard.vercel.com)
2. Selecciona tu proyecto ScanVia
3. Ve a **Settings** → **Environment Variables**
4. Agrega estas variables:
   ```
   SUPABASE_PROJECT_ID = dwcdpkqlutgaqnoxymxl
   SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3Y2Rwa3FsdXRnYXFub3h5bXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMDA1ODgsImV4cCI6MjA5ODg3NjU4OH0.nkuU3aDeZHx9PeyaZxJmV9SDh2fLyjMOofjNePHP5rY
   AUTH_SECRET = [genera-un-valor-aleatorio-seguro]
   ADMIN_USER = admin
   ADMIN_PASSWORD = [cambia-esto-a-algo-seguro]
   NODE_ENV = production
   ```

### 2. Sincroniza con GitHub

```bash
git add .
git commit -m "Add Vercel configuration"
git push origin main
```

### 3. Conecta a Vercel

1. En Vercel, haz clic en **Add New Project**
2. Selecciona tu repositorio de GitHub
3. Selecciona la carpeta raíz: `Scanvia/` (donde está el `server.js`)
4. Vercel detectará automáticamente que es un proyecto Node.js
5. Agrega las variables de entorno desde el paso 1
6. Haz clic en **Deploy**

## ✅ Verificación Después del Despliegue

1. Tu app estará disponible en: `https://[your-project].vercel.app`
2. Prueba los endpoints:
   - `https://[your-project].vercel.app/login.html` - Página de login
   - `https://[your-project].vercel.app/api/auth/me` - Check de autenticación

## 🔧 Troubleshooting

Si ves errores en el despliegue:

1. **Error de base de datos**: Verifica que `SUPABASE_DB_URL` esté correcta
2. **Error 404**: Asegúrate de que `/public/` está correctamente servido
3. **Error de autenticación**: Regenera `AUTH_SECRET` con un valor aleatorio

## 📝 Notas Importantes

- El archivo `.env` nunca se sube a GitHub (está en `.gitignore`)
- Las variables de entorno se configuran en el panel de Vercel, no localmente
- Vercel automáticamente usa Node 18+ LTS

## 🛠️ Desarrollo Local

Para desarrollo local, usa:

```bash
npm install
npm run dev
```

Asegúrate de tener un archivo `.env` con las variables correctas en tu máquina.
