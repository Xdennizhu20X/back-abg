module.exports = function keepDatabaseAlive(sequelize) {
  setInterval(async () => {
    try {
      await sequelize.query('SELECT 1'); // consulta mínima
      console.log('[Ping] Base de datos viva');
    } catch (error) {
      console.error('[Ping] Error al mantener viva la base de datos:', error);
    }
  }, 1000 * 60 * 5); // cada 5 minutos
};
