const express = require('express');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initializeDatabase } = require('./db/database');
const createApiRouter = require('./routes/api');

const app = express();
const port = process.env.PORT || 3000;
// Configuración de credenciales de administrador
//(son datos quemados, cuando se defina la base de datos se cambia)
const adminCredentials = {
  username: process.env.ADMIN_USER || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};
const adminCookieName = 'scanvia_admin';
const authSecret = process.env.AUTH_SECRET || process.env.SESSION_SECRET || 'scanvia-auth-secret';

function signValue(value) {
  return crypto.createHmac('sha256', authSecret).update(value).digest('base64url');
}

function createAuthToken(username) {
  const payload = Buffer.from(username, 'utf8').toString('base64url');
  return `${payload}.${signValue(payload)}`;
}

function verifyAuthToken(token) {
  if (!token || !token.includes('.')) {
    return null;
  }

  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex === -1) {
    return null;
  }

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signValue(payload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  return Buffer.from(payload, 'base64url').toString('utf8');
}

function getCookieValue(req, cookieName) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = cookieHeader.split(';').map((item) => item.trim());

  for (const cookie of cookies) {
    if (!cookie) {
      continue;
    }

    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const name = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();

    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

function getAuthenticatedUser(req) {
  const token = getCookieValue(req, adminCookieName);
  const username = verifyAuthToken(token);

  if (!username) {
    return null;
  }

  return { username };
}

function requireAdminSession(req, res, next) {
  if (getAuthenticatedUser(req)) {
    return next();
  }

  return res.redirect('/login.html');
}

function requireAdminApiSession(req, res, next) {
  if (getAuthenticatedUser(req)) {
    return next();
  }

  return res.status(401).json({ error: 'No autorizado' });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === adminCredentials.username && password === adminCredentials.password) {
    const token = createAuthToken(adminCredentials.username);
    res.cookie(adminCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return res.json({
      message: 'Inicio de sesión correcto',
      user: {
        username: adminCredentials.username,
      },
    });
  }

  return res.status(401).json({ error: 'Credenciales inválidas' });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(adminCookieName, { path: '/' });
  return res.json({ message: 'Sesión cerrada' });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthenticatedUser(req);

  if (user) {
    return res.json({ authenticated: true, user });
  }

  return res.status(401).json({ authenticated: false });
});

app.use('/api', createApiRouter(requireAdminApiSession));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', requireAdminSession, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', requireAdminSession, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

async function startServer() {
  await initializeDatabase();

  app.listen(port, () => {
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
  });
}

// Solo iniciar servidor si se ejecuta directamente (desarrollo local)
if (require.main === module) {
  startServer().catch((error) => {
    console.error('No fue posible iniciar el servidor:', error.message);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
};
