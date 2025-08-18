const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Predio = sequelize.define('Predio', {
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
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ubicacion: {
      type: DataTypes.STRING,
      allowNull: false
    },
    parroquia: {
      type: DataTypes.STRING,
      allowNull: true // Aplica para ambos
    },
    tipo: {
      type: DataTypes.ENUM('origen', 'destino'),
      allowNull: false
    },

    // Campos exclusivos destino
    localidad: {
      type: DataTypes.STRING,
      allowNull: true
    },
    condicion_tenencia: {
      type: DataTypes.ENUM('Propio', 'Arrendado', 'Prestado'),
      allowNull: true
    },

    // Campos exclusivos origen
    direccion: {
      type: DataTypes.STRING,
      allowNull: true
    },
    es_centro_faenamiento: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    }
  }, {
    tableName: 'predios',
    timestamps: true
  });

  return Predio;
};
