const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);


// Función para sincronizar la base de datos
const syncDatabase = async (force = false) => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');

    // Importar modelos después de la conexión
    const { syncModels, Usuario } = require('../models');

    // Sincronizar todos los modelos en el orden correcto
    await syncModels(force);
    console.log('Base de datos sincronizada correctamente.');

    // Si es la primera vez (force = true), crear un usuario administrador por defecto
    if (force) {
      await Usuario.create({
        nombre: 'Administrador',
        email: 'admin@abg.gob.ec',
        password: 'admin123',
        rol: 'admin'
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
  syncDatabase
}; 