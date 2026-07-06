const express = require('express');
const QRCode = require('qrcode');
const crypto = require('crypto');

const { createUser, listUsers, getUserById } = require('../db/database');

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

function createApiRouter(requireAdminApiSession) {
  const router = express.Router();

  router.get('/usuarios', requireAdminApiSession, async (req, res) => {
    try {
      const usuarios = await listUsers();

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

      const createdUser = await createUser(usuario, contactos);
      const createdAt = createdUser && createdUser.createdAt ? createdUser.createdAt : new Date().toISOString();

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
          createdAt,
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
      const usuario = await getUserById(id);

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      return res.json({
        id: usuario.id,
        cedula: usuario.cedula,
        nombre: usuario.nombre,
        tipoSangre: usuario.tipoSangre,
        alergias: usuario.alergias,
        medicamentos: usuario.medicamentos,
        contactos: usuario.contactos,
        createdAt: usuario.createdAt,
      });
    } catch (error) {
      return res.status(500).json({ error: 'No fue posible cargar el usuario' });
    }
  });

  return router;
}

module.exports = createApiRouter;
