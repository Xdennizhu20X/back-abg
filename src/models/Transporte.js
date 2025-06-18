const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transporte = sequelize.define('Transporte', {
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

    // 🚚 Tipo de transporte
    es_terrestre: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    // Campos obligatorios si es terrestre
    nombre_transportista: {
      type: DataTypes.STRING,
      allowNull: true // Validar solo si es_terrestre === true
    },
    placa: {
      type: DataTypes.STRING,
      allowNull: true // Igual
    },
    tipo_transporte: {
      type: DataTypes.STRING,
      allowNull: true
    },
    telefono_transportista: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cedula_transportista: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // Campo obligatorio si NO es terrestre
    detalle_otro: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'transportes',
    timestamps: true
  });

  return Transporte;
};
