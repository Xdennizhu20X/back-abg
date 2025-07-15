const cron = require('node-cron');
const { actualizarEstadosAutomaticos } = require('../controllers/movilizacionController');

// Ejecutar cada hora en el minuto 0
cron.schedule('0 * * * *', () => {
  console.log('Ejecutando tarea para actualizar estados a 72 horas...');
  actualizarEstadosAutomaticos();
});
