// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Conexión a PostgreSQL usando DATABASE_URL con SSL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // permite certificados autofirmados de Render
    },
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

// Función para sincronizar la base de datos
const syncDatabase = async (force = false) => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');

    // Importar modelos
    const { syncModels, Usuario } = require('../models');

    // Sincronizar todos los modelos
    await syncModels(force);
    console.log('Base de datos sincronizada correctamente.');

    // Crear usuario admin por defecto si force = true
    if (force) {
      await Usuario.create({
        nombre: 'Administrador',
        email: 'admin@abg.gob.ec',
        password: 'admin123',
        rol: 'admin',
      });
      console.log('Usuario administrador creado por defecto.');
    }
  } catch (error) {
    console.error('Error al sincronizar la base de datos:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  syncDatabase,
};
