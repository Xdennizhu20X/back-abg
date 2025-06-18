module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  return sequelize.define('Certificado', {
    numero_certificado: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    fecha_emision: DataTypes.DATE,
    solicitante_nombre: DataTypes.STRING,
    solicitante_cedula: DataTypes.STRING,
    solicitante_telefono: DataTypes.STRING,
    tipo_movilizacion: DataTypes.STRING,
    predio_origen: DataTypes.STRING,
    parroquia_origen: DataTypes.STRING,
    localidad_origen: DataTypes.STRING,
    tipo_origen: DataTypes.STRING,
    centro_faenamiento: DataTypes.STRING,
    nombre_predio_destino: DataTypes.STRING,
    direccion_destino: DataTypes.STRING,
    parroquia_destino: DataTypes.STRING,
    tipo_via: DataTypes.STRING,
    tipo_transporte: DataTypes.STRING,
    nombre_transportista: DataTypes.STRING,
    placa_transporte: DataTypes.STRING,
    cedula_transportista: DataTypes.STRING,
    telefono_transportista: DataTypes.STRING,
    detalle_transporte: DataTypes.STRING,
    valido_desde: DataTypes.DATE,
    valido_hasta: DataTypes.DATE,
    estado: {
      type: DataTypes.STRING,
      defaultValue: 'pendiente'
    }
  });
};
