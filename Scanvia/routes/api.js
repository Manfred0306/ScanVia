const express = require('express');
const QRCode = require('qrcode');
const crypto = require('crypto');

const { getPool, sql } = require('../db/database');

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeContacts(contacts) {
  if (!Array.isArray(contacts)) {
    return [];
  }

  return contacts
    .map((contact) => ({
      nombre: normalizeString(contact.nombre),
      relacion: normalizeString(contact.relacion),
      telefono: normalizeString(contact.telefono),
    }))
    .filter((contact) => contact.nombre || contact.relacion || contact.telefono);
}

async function createUserWithContacts(usuario, contactos) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const request = new sql.Request(transaction);
    request.input('id', sql.UniqueIdentifier, usuario.id);
    request.input('cedula', sql.NVarChar(40), usuario.cedula);
    request.input('nombre', sql.NVarChar(120), usuario.nombre);
    request.input('tipoSangre', sql.NVarChar(10), usuario.tipoSangre || null);
    request.input('alergias', sql.NVarChar(sql.MAX), usuario.alergias || null);
    request.input('medicamentos', sql.NVarChar(sql.MAX), usuario.medicamentos || null);

    await request.query(`
      INSERT INTO dbo.usuarios (
        id,
        cedula,
        nombre,
        tipo_sangre,
        alergias,
        medicamentos
      ) VALUES (
        @id,
        @cedula,
        @nombre,
        @tipoSangre,
        @alergias,
        @medicamentos
      )
    `);

    for (let index = 0; index < contactos.length; index += 1) {
      const contacto = contactos[index];

      const contactoRequest = new sql.Request(transaction);
      contactoRequest.input('usuarioId', sql.UniqueIdentifier, usuario.id);
      contactoRequest.input('nombre', sql.NVarChar(120), contacto.nombre);
      contactoRequest.input('relacion', sql.NVarChar(120), contacto.relacion);
      contactoRequest.input('telefono', sql.NVarChar(40), contacto.telefono);
      contactoRequest.input('orden', sql.Int, index);

      await contactoRequest.query(`
        INSERT INTO dbo.contactos (
          usuario_id,
          nombre,
          relacion,
          telefono,
          orden
        ) VALUES (
          @usuarioId,
          @nombre,
          @relacion,
          @telefono,
          @orden
        )
      `);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

function createApiRouter(requireAdminApiSession) {
  const router = express.Router();

  router.get('/usuarios', requireAdminApiSession, async (req, res) => {
    try {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT
          CONVERT(VARCHAR(36), id) AS id,
          cedula,
          nombre,
          tipo_sangre AS tipoSangre,
          alergias,
          medicamentos,
          CONVERT(VARCHAR(33), created_at, 126) AS createdAt
        FROM dbo.usuarios
        ORDER BY created_at DESC, nombre ASC
      `);

      const usuarios = result.recordset;

      const usuariosConVista = usuarios.map((usuario) => ({
        ...usuario,
        emergenciaUrl: `/emergencia.html?id=${usuario.id}`,
      }));

      return res.json({ usuarios: usuariosConVista });
    } catch (error) {
      return res.status(500).json({ error: 'No fue posible listar los usuarios' });
    }
  });

  router.post('/usuarios', requireAdminApiSession, async (req, res) => {
    try {
      const { cedula, nombre, tipoSangre, alergias, medicamentos } = req.body;
      const contactos = normalizeContacts(req.body.contactos);

      const cedulaNormalizada = normalizeString(cedula);
      const nombreNormalizado = normalizeString(nombre);
      const tipoSangreNormalizado = normalizeString(tipoSangre);

      if (!cedulaNormalizada || !nombreNormalizado || contactos.length < 2) {
        return res.status(400).json({
          error: 'Debe completar cédula, nombre y al menos 2 contactos de emergencia.',
        });
      }

      const id = crypto.randomUUID();
      const emergenciaUrl = `${req.protocol}://${req.get('host')}/emergencia.html?id=${id}`;
      const qrDataUrl = await QRCode.toDataURL(emergenciaUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 320,
      });

      const usuario = {
        id,
        cedula: cedulaNormalizada,
        nombre: nombreNormalizado,
        tipoSangre: tipoSangreNormalizado,
        alergias: normalizeString(alergias),
        medicamentos: normalizeString(medicamentos),
      };

      await createUserWithContacts(usuario, contactos);

      return res.status(201).json({
        message: 'Usuario creado correctamente',
        usuario: {
          id,
          cedula: usuario.cedula,
          nombre: usuario.nombre,
          tipoSangre: usuario.tipoSangre,
          alergias: usuario.alergias,
          medicamentos: usuario.medicamentos,
          contactos,
          qr: qrDataUrl,
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: 'No fue posible crear el usuario',
      });
    }
  });

  router.get('/usuarios/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const pool = await getPool();
      const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT
            CONVERT(VARCHAR(36), id) AS id,
            cedula,
            nombre,
            tipo_sangre AS tipoSangre,
            alergias,
            medicamentos,
            CONVERT(VARCHAR(33), created_at, 126) AS createdAt
          FROM dbo.usuarios
          WHERE id = @id
        `);

      const usuarios = result.recordset;

      if (!usuarios.length) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const contactosResult = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT
            nombre,
            relacion,
            telefono
          FROM dbo.contactos
          WHERE usuario_id = @id
          ORDER BY orden ASC, id ASC
        `);

      const contactos = contactosResult.recordset;

      const usuario = usuarios[0];

      return res.json({
        id: usuario.id,
        cedula: usuario.cedula,
        nombre: usuario.nombre,
        tipoSangre: usuario.tipoSangre,
        alergias: usuario.alergias,
        medicamentos: usuario.medicamentos,
        contactos,
        createdAt: usuario.createdAt,
      });
    } catch (error) {
      return res.status(500).json({ error: 'No fue posible cargar el usuario' });
    }
  });

  return router;
}

module.exports = createApiRouter;
