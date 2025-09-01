const express = require('express');
const router = express.Router();
const { registrarUsuario, obtenerPerfil, obtenerUsuarios, actualizarUsuario, eliminarUsuario, aprobarUsuario, rechazarUsuario } = require('../controllers/usuarioController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { Usuario } = require('../models');

// Ruta pública para registro de usuarios
router.post('/registro', registrarUsuario);

// Rutas protegidas
router.get('/perfil', verificarToken, obtenerPerfil);

// Rutas para administradores
router.get('/admin/usuarios', verificarToken, verificarRol(['admin']), obtenerUsuarios);
router.put('/admin/usuarios/:id', verificarToken, verificarRol(['admin']), actualizarUsuario);
router.post('/admin/usuarios/:id/aprobar', verificarToken, verificarRol(['admin']), aprobarUsuario);
router.post('/admin/usuarios/:id/rechazar', verificarToken, verificarRol(['admin']), rechazarUsuario);
router.post('/admin/delete/usuarios/:id', verificarToken, verificarRol(['admin']), eliminarUsuario);


module.exports = router;        