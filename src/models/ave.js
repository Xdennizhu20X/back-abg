const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ave = sequelize.define('Ave', {
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
    numero_galpon: {
      type: DataTypes.STRING,
      allowNull: true
    },
    categoria: {
      type: DataTypes.STRING, // Engorde / Postura
      allowNull: true
    },
    edad: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    total_aves: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'aves',
    timestamps: true
  });

  return Ave;
};
