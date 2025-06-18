const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const controller = require('../controllers/predioController');
console.log(controller); // Deberías ver un objeto con createPredio, getTodosLosPredios, etc.

const {
  createPredio,
  getTodosLosPredios,
  getPrediosPorUsuario,
  updatePredio,
  deletePredio
} = controller;

// Crear predio (requiere autenticación)
router.post('/crear', verificarToken, createPredio);

// Obtener todos los predios
router.get('/todos', getTodosLosPredios);

// Obtener predios por usuario (ID en URL)
router.get('/usuario/:usuarioId', getPrediosPorUsuario);

// Actualizar predio por ID
router.put('/:id', verificarToken, updatePredio);

// Eliminar predio por ID
router.delete('/:id', verificarToken, deletePredio);

module.exports = router;
