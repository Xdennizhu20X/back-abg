const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FirmaDigital = sequelize.define('FirmaDigital', {
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
    fecha_firma: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    firma_url: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'firmas_digitales',
    timestamps: true
  });

  return FirmaDigital;
}; 