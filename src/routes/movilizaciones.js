const express = require('express');
const router = express.Router();
const {
  registrarMovilizacionCompleta,
  getMovilizaciones,
  getMovilizacionById,
  filtrarMovilizaciones,
  getTotalPendientes,
  getAnimalesByMovilizacionId,
  actualizarEstadoMovilizacion,
  actualizarEstadosAutomaticos
} = require('../controllers/movilizacionController');

const { verificarToken, verificarRol } = require('../middleware/auth');

// Registrar una movilización completa
router.post('/registro-completo', verificarToken, verificarRol(['ganadero']), registrarMovilizacionCompleta);

// Ver movilizaciones (dependiendo del rol)
router.get('/', verificarToken, (req, res, next) => {
  // Ganaderos solo ven sus propias movilizaciones
  if (req.usuario.rol === 'ganadero') {
    req.query.usuario_id = req.usuario.id;
  }
  // Técnicos y admins ven todas
  return getMovilizaciones(req, res, next);
});

// Contador de movilizaciones pendientes
router.get('/pendientes/count', verificarToken, getTotalPendientes);

// Filtrar movilizaciones
router.get('/filtrar', verificarToken, filtrarMovilizaciones);

// Ver una movilización específica
router.get('/:id', verificarToken, getMovilizacionById);

// Actualizar estado (alerta/finalizado)
router.patch('/:id/estado', verificarToken, actualizarEstadoMovilizacion);

// Obtener animales de una movilización
router.get('/:id/animales', verificarToken, getAnimalesByMovilizacionId);

// Ruta para uso interno (cron job) - sin autenticación
router.post('/actualizar-estados-automaticos', actualizarEstadosAutomaticos);

module.exports = router;