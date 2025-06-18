const express = require('express');
const router = express.Router();
const { register, login, getProfile, logout, forgotPassword, resetPassword } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.post('/logout', verificarToken, logout);
router.get('/profile', verificarToken, getProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router; 