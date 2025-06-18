const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Movilizacion = sequelize.define('Movilizacion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    predio_origen_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'predios',
        key: 'id'
      }
    },
    predio_destino_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'predios',
        key: 'id'
      }
    },
    fecha_solicitud: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
      defaultValue: 'pendiente'
    },
    observaciones_tecnico: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tecnico_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    fecha_aprobacion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    certificado_url: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'movilizaciones',
    timestamps: true
  });

  Movilizacion.associate = (models) => {
    Movilizacion.hasMany(models.Animal, { foreignKey: 'movilizacion_id' });
    Movilizacion.hasMany(models.Ave, { foreignKey: 'movilizacion_id' });
    Movilizacion.hasOne(models.Transporte, { foreignKey: 'movilizacion_id' });
    Movilizacion.belongsTo(models.Predio, { as: 'predio_origen', foreignKey: 'predio_origen_id' });
    Movilizacion.belongsTo(models.Predio, { as: 'predio_destino', foreignKey: 'predio_destino_id' });
    Movilizacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });
  };

  return Movilizacion;
};