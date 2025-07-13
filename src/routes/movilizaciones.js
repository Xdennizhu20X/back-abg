const express = require('express');
const router = express.Router();
const {
  registrarMovilizacionCompleta,
  getMovilizaciones,
  getMovilizacionById,
  updateMovilizacion,
  filtrarMovilizaciones,
  registrarValidacion,
  rechazarMovilizacion,
  getTotalPendientes,
  getAnimalesByMovilizacionId
} = require('../controllers/movilizacionController');

const { verificarToken, verificarRol } = require('../middleware/auth');

// Ganadero: Registrar una movilización completa (sin validez ni firmas)
router.post('/registro-completo', verificarToken, verificarRol(['ganadero']), registrarMovilizacionCompleta);

// Ganadero: Ver sus propias movilizaciones
router.get('/mis-movilizaciones', verificarToken, verificarRol(['ganadero']), getMovilizaciones);

// Técnico y Admin: Ver todas las movilizaciones
router.get('/', verificarToken, verificarRol(['tecnico', 'admin']), getMovilizaciones);

router.get('/pendientes/count', getTotalPendientes);


router.get('/filtrar', verificarToken, filtrarMovilizaciones);

router.post('/:id/validacion', verificarToken, registrarValidacion);

router.put('/:id/rechazar', verificarToken, rechazarMovilizacion);


// Todos: Ver una movilización específica
router.get('/:id', verificarToken, verificarRol(['ganadero', 'tecnico', 'admin']), getMovilizacionById);

// Técnico y Admin: Actualizar estado y observaciones técnicas
router.patch('/:id', verificarToken, verificarRol(['tecnico', 'admin']), updateMovilizacion);

router.get('/:id/animales', getAnimalesByMovilizacionId);


module.exports = router;
