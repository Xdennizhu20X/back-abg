const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { syncDatabase, sequelize } = require('./config/database'); 
const keepDatabaseAlive = require('./utils/dbKeepAlive'); 

const usuarioRoutes = require('./routes/usuarioRoutes');
const authRoutes = require('./routes/auth');
const movilizacionRoutes = require('./routes/movilizaciones');
const pdfRoutes = require('./routes/pdfRoutes');
const { actualizarEstadosAutomaticos } = require('./controllers/movilizacionController');

const app = express();

const allowedOrigins = [
  'https://web-abg.vercel.app', // Producción
  'http://localhost:3001',
  'http://localhost:3000' 
         // Desarrollo local
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true, // Solo si usas cookies o auth headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/movilizaciones', movilizacionRoutes);
app.use('/api/pdf', pdfRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API de Movilización de Ganado' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

cron.schedule('0 * * * *', () => {
  console.log('Ejecutando tarea para actualizar estados a 72 horas...');
  actualizarEstadosAutomaticos();
});

const startServer = async () => {
  try {
    await syncDatabase();

    // Activar keep-alive solo si es necesario
    if (process.env.NODE_ENV === 'production') {
      keepDatabaseAlive(sequelize); // 👈 llamada al keep-alive
    }
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
