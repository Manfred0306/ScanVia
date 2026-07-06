const { app } = require('../server');

// Para desarrollo local
module.exports = app;

// Para Vercel (serverless)
module.exports.default = app;
