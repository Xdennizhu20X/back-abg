require('dotenv').config();
const { syncDatabase } = require('../config/database');

const initDatabase = async () => {
  try {
    console.log('Iniciando inicialización de la base de datos...');
    await syncDatabase(true);
    console.log('Base de datos inicializada correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }
};

initDatabase(); 