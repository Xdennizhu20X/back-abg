const express = require('express');
const router = express.Router();
const { registrarUsuario, obtenerPerfil } = require('../controllers/usuarioController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { Usuario } = require('../models');

// Ruta pública para registro de usuarios
router.post('/registro', registrarUsuario);

// Rutas protegidas
router.get('/perfil', verificarToken, obtenerPerfil);

// Rutas para administradores
router.get('/admin/usuarios', verificarToken, verificarRol(['admin']), async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['password'] }
    });
    res.json({
      success: true,
      data: usuarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
});

module.exports = router; 