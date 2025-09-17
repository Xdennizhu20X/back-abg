require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { syncDatabase, sequelize } = require('./config/database');
const keepDatabaseAlive = require('./utils/dbKeepAlive');


const usuarioRoutes = require('./routes/usuarioRoutes');
const authRoutes = require('./routes/auth');
const movilizacionRoutes = require('./routes/movilizaciones');
const pdfRoutes = require('./routes/pdfRoutes');
const reporteRoutes = require('./routes/reporteRoutes'); // <-- RUTA AGREGADA
const { actualizarEstadosAutomaticos } = require('./controllers/movilizacionController');

const app = express();

const allowedOrigins = [
  'https://web-abg.vercel.app', // Producción web
  'http://localhost:3001', //Local web
  'http://localhost:3000', //local web alternativa
  'http://localhost:4000', //Local web build
  'https://movilizacion-animales.vercel.app', // Produccion movil
  'http://51.178.31.63:3001',
  'http://51.178.31.63:4000', // Puerto 4000 para build de producción
  'http://51.178.31.63:8080',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Permitir herramientas como Postman

    // Permitir origenes explícitos o cualquier localhost dinámico
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://localhost')
    ) {
      return callback(null, true);
    }

    return callback(new Error('No permitido por CORS: ' + origin));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/movilizaciones', movilizacionRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/reportes', reporteRoutes); // <-- RUTA AGREGADA

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
      console.log(`Servidor HTTP corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();