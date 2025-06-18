const express = require('express');
const router = express.Router();
const { registrarMovilizacionCompleta } = require('../controllers/movilizacionController');
const { verificarToken } = require('../middleware/auth');

// Ruta para registrar movilización completa
router.post('/registro-completo', verificarToken, registrarMovilizacionCompleta);

module.exports = router; 