const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Animal = sequelize.define('Animal', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    movilizacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'movilizaciones',
        key: 'id'
      }
    },
    especie: {
      type: DataTypes.STRING, // 'animal' o 'ave'
      allowNull: true
    },
    identificador: {
      type: DataTypes.STRING,
      allowNull: true // aves pueden no tener
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: true
    },
    raza: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sexo: {
      type: DataTypes.ENUM('M', 'H', 'Otro'),
      allowNull: true
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true
    },
    edad: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    comerciante: {
      type: DataTypes.STRING,
      allowNull: true
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
  }, {
    tableName: 'animales',
    timestamps: true
  });

  return Animal;
};
