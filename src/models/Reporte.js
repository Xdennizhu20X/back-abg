const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reporte = sequelize.define('Reporte', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tecnico_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    movilizacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'movilizaciones',
        key: 'id'
      }
    },
    fecha_reporte: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
      defaultValue: 'pendiente'
    }
  }, {
    tableName: 'reportes',
    timestamps: true
  });

  return Reporte;
}; 