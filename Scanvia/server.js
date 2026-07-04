const express = require('express');
const path = require('path');
const session = require('express-session');

const { initializeDatabase } = require('./db/database');
const createApiRouter = require('./routes/api');

const app = express();
const port = process.env.PORT || 3000;
const adminCredentials = {
  username: process.env.ADMIN_USER || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};

function requireAdminSession(req, res, next) {
  if (req.session && req.session.adminUser) {
    return next();
  }

  return res.redirect('/login.html');
}

function requireAdminApiSession(req, res, next) {
  if (req.session && req.session.adminUser) {
    return next();
  }

  return res.status(401).json({ error: 'No autorizado' });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'scanvia-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === adminCredentials.username && password === adminCredentials.password) {
    req.session.adminUser = {
      username: adminCredentials.username,
    };

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
  if (!req.session) {
    return res.json({ message: 'Sesión cerrada' });
  }

  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: 'No fue posible cerrar la sesión' });
    }

    return res.json({ message: 'Sesión cerrada' });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.adminUser) {
    return res.json({ authenticated: true, user: req.session.adminUser });
  }

  return res.status(401).json({ authenticated: false });
});

app.get('/admin', requireAdminSession, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', requireAdminSession, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

async function startServer() {
  await initializeDatabase();

  app.use('/api', createApiRouter(requireAdminApiSession));

  app.use(express.static(path.join(__dirname, 'public')));

  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.listen(port, () => {
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
  });
}

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
