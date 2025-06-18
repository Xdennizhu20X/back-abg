const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const movilizacionRoutes = require('./movilizaciones');

router.use('/auth', authRoutes);
router.use('/movilizaciones', movilizacionRoutes);

module.exports = router; 