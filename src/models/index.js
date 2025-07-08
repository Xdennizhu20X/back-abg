const { sequelize } = require('../config/database');

// Importar modelos
const UsuarioModel = require('./Usuario');
const PredioModel = require('./Predio');
const MovilizacionModel = require('./Movilizacion');
const AnimalModel = require('./Animal');
const AveModel = require('./ave'); // ✅ importar modelo Ave
const TransporteModel = require('./Transporte');
const FirmaDigitalModel = require('./FirmaDigital');
const ReporteModel = require('./Reporte');
const ValidacionModel = require('./validacion');

// Inicializar modelos
const Usuario = UsuarioModel(sequelize);
const Predio = PredioModel(sequelize);
const Movilizacion = MovilizacionModel(sequelize);
const Animal = AnimalModel(sequelize);
const Ave = AveModel(sequelize); // ✅ inicializar modelo Ave
const Transporte = TransporteModel(sequelize);
const FirmaDigital = FirmaDigitalModel(sequelize);
const Reporte = ReporteModel(sequelize);
const Validacion = ValidacionModel(sequelize);

// Definir relaciones
const defineRelations = () => {
  // Relaciones Usuario
  Usuario.hasMany(Predio, { foreignKey: 'usuario_id' });
  Usuario.hasMany(Movilizacion, { foreignKey: 'usuario_id' });
  Usuario.hasMany(Movilizacion, { foreignKey: 'tecnico_id', as: 'revisiones' });
  Usuario.hasMany(FirmaDigital, { foreignKey: 'tecnico_id' });
  Usuario.hasMany(Reporte, { foreignKey: 'generado_por' });

  // Relaciones Predio
  Predio.belongsTo(Usuario, { foreignKey: 'usuario_id' });
  Predio.hasMany(Movilizacion, { foreignKey: 'predio_origen_id', as: 'movilizaciones_origen' });
  Predio.hasMany(Movilizacion, { foreignKey: 'predio_destino_id', as: 'movilizaciones_destino' });

  // Relaciones Movilizacion
  Movilizacion.belongsTo(Usuario, { foreignKey: 'usuario_id' });
  Movilizacion.belongsTo(Usuario, { foreignKey: 'tecnico_id', as: 'tecnico' });
  Movilizacion.belongsTo(Predio, { foreignKey: 'predio_origen_id', as: 'predio_origen' });
  Movilizacion.belongsTo(Predio, { foreignKey: 'predio_destino_id', as: 'predio_destino' });
  Movilizacion.hasMany(Animal, { foreignKey: 'movilizacion_id' });
  Movilizacion.hasMany(Ave, { foreignKey: 'movilizacion_id' }); // ✅ relación nueva
  Movilizacion.hasOne(Transporte, { foreignKey: 'movilizacion_id' });
  Movilizacion.hasOne(FirmaDigital, { foreignKey: 'movilizacion_id' });
Movilizacion.hasOne(Validacion, { foreignKey: 'movilizacion_id' });
Validacion.belongsTo(Movilizacion, { foreignKey: 'movilizacion_id' });
  // Relaciones Animal
  Animal.belongsTo(Movilizacion, { foreignKey: 'movilizacion_id' });

  // Relaciones Ave ✅
  Ave.belongsTo(Movilizacion, { foreignKey: 'movilizacion_id' });

  // Relaciones Transporte
  Transporte.belongsTo(Movilizacion, { foreignKey: 'movilizacion_id' });

  // Relaciones FirmaDigital
  FirmaDigital.belongsTo(Usuario, { foreignKey: 'tecnico_id' });
  FirmaDigital.belongsTo(Movilizacion, { foreignKey: 'movilizacion_id' });

  // Relaciones Reporte
  Reporte.belongsTo(Usuario, { foreignKey: 'generado_por' });
};

// Definir el orden de sincronización
const syncModels = async () => {
  try {
    await Usuario.sync({ alter: true });
    await Predio.sync({ alter: true });
    await Movilizacion.sync({ alter: true });
    await Animal.sync({ alter: true });
    await Transporte.sync({ alter: true });
    await FirmaDigital.sync({ alter: true });
    await Reporte.sync({ alter: true });
    await Ave.sync({ alter: true });
    await Validacion.sync({ alter: true });  // <-- Agregado para sincronizar Validacion

    console.log('Modelos sincronizados correctamente');
  } catch (error) {
    console.error('Error al sincronizar modelos:', error);
    throw error;
  }
};
// Definir relaciones
defineRelations();

module.exports = {
  sequelize,
  Usuario,
  Predio,
  Movilizacion,
  Animal,
  Ave, // ✅ exportar Ave
  Transporte,
  FirmaDigital,
  Reporte,
  Validacion, 
  syncModels
};
