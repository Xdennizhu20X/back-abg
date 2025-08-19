const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');

// @route   GET api/reportes/movilizaciones
// @desc    Descargar reporte de movilizaciones con filtros opcionales
// @access  Private
router.get('/movilizaciones', reporteController.descargarReporteMovilizaciones);

// @route   GET api/reportes/usuario/:cedula
// @desc    Descargar reporte de movilizaciones para un usuario por su cédula
// @access  Private
router.get('/usuario/:cedula', reporteController.descargarReportePorCedula);

// @route   GET api/reportes/datos-grafico
// @desc    Obtener datos agregados para el gráfico de reportes por usuario
// @access  Private
router.get('/datos-grafico', reporteController.obtenerDatosGrafico);

// @route   GET api/reportes/datos-grafico-global
// @desc    Obtener datos agregados para el gráfico de reportes de todos los usuarios
// @access  Private
router.get('/datos-grafico-global', reporteController.obtenerDatosGraficoGlobal);

module.exports = router;
