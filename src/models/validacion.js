const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Validacion = sequelize.define('Validacion', {
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
    tiempo_validez: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hora_inicio: {
      type: DataTypes.TIME,
      allowNull: true
    },
    hora_fin: {
      type: DataTypes.TIME,
      allowNull: true
    },
    fecha_emision: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    firma_tecnico: {
      type: DataTypes.STRING, // ruta o URL a la imagen
      allowNull: true
    },
    nombre_tecnico: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'validaciones',
    timestamps: true
  });

  Validacion.associate = (models) => {
    Validacion.belongsTo(models.Movilizacion, { foreignKey: 'movilizacion_id' });
  };

  return Validacion;
};
