const { generarReporteCertificados, obtenerDatosMovilizaciones } = require('../utils/xlsReporte');

const obtenerDatosGraficoGlobal = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;

    const filtros = { fechaDesde, fechaHasta };
    const movilizaciones = await obtenerDatosMovilizaciones(filtros);

    const totalMovilizaciones = movilizaciones.length;
    const totalAnimales = movilizaciones.reduce((sum, m) => sum + (m.Animals?.length || 0), 0);
    const totalAves = movilizaciones.reduce((sum, m) => 
      sum + (m.Aves?.reduce((aveSum, ave) => aveSum + (ave.total_aves || 0), 0) || 0), 0
    );

    res.json({
      success: true,
      data: {
        totalMovilizaciones,
        totalAnimales,
        totalAves,
        movilizaciones, // Opcional: devolver todas las movilizaciones si se necesita detalle en el frontend
      },
    });
  } catch (error) {
    console.error('Error al obtener los datos para el gráfico global:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los datos para el gráfico global',
      error: error.message,
    });
  }
};

const obtenerDatosGrafico = async (req, res) => {
  try {
    const { cedula, fechaDesde, fechaHasta } = req.query;

    if (!cedula) {
      return res.status(400).json({ message: 'El número de cédula es requerido.' });
    }

    const filtros = { cedula, fechaDesde, fechaHasta };
    const movilizaciones = await obtenerDatosMovilizaciones(filtros);

    const totalMovilizaciones = movilizaciones.length;
    const totalAnimales = movilizaciones.reduce((sum, m) => sum + (m.Animals?.length || 0), 0);
    const totalAves = movilizaciones.reduce((sum, m) => 
      sum + (m.Aves?.reduce((aveSum, ave) => aveSum + (ave.total_aves || 0), 0) || 0), 0
    );

    res.json({
      success: true,
      data: {
        totalMovilizaciones,
        totalAnimales,
        totalAves,
        movilizaciones, // Opcional: devolver todas las movilizaciones si se necesita detalle en el frontend
      },
    });
  } catch (error) {
    console.error('Error al obtener los datos para el gráfico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los datos para el gráfico',
      error: error.message,
    });
  }
};

const descargarReporteMovilizaciones = async (req, res) => {
  try {
    const filtros = { ...req.query }; // Copiamos para poder modificarlo

    // --- NUEVA LÓGICA DE FILTROS DE FECHA ---
    const { año, mes, mesDesde, mesHasta } = filtros;

    if (año) {
      const year = parseInt(año, 10);
      // Eliminar para no pasarlos al generador de reportes directamente
      delete filtros.año;
      delete filtros.mes;
      delete filtros.mesDesde;
      delete filtros.mesHasta;

      if (mes) { // 1. Filtro por mes específico
        const month = parseInt(mes, 10);
        filtros.fechaDesde = new Date(year, month - 1, 1);
        filtros.fechaHasta = new Date(year, month, 0, 23, 59, 59, 999); // Último día del mes
      } else if (mesDesde && mesHasta) { // 2. Filtro por rango de meses
        const startMonth = parseInt(mesDesde, 10);
        const endMonth = parseInt(mesHasta, 10);
        filtros.fechaDesde = new Date(year, startMonth - 1, 1);
        filtros.fechaHasta = new Date(year, endMonth, 0, 23, 59, 59, 999);
      } else { // 3. Filtro por año completo
        filtros.fechaDesde = new Date(year, 0, 1);
        filtros.fechaHasta = new Date(year, 11, 31, 23, 59, 59, 999);
      }
    }
    // --- FIN DE LA LÓGICA DE FECHAS ---

    console.log('Generando reporte con filtros procesados:', filtros);
    const buffer = await generarReporteCertificados(filtros);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte_movilizaciones_${Date.now()}.xlsx"`
    );

    res.send(buffer);
  } catch (error) {
    console.error('Error al generar el reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el reporte',
      error: error.message,
    });
  }
};

const descargarReportePorCedula = async (req, res) => {
  try {
    const { cedula } = req.params;
    if (!cedula) {
      return res.status(400).json({ message: 'El número de cédula es requerido.' });
    }

    console.log(`Generando reporte para la cédula: ${cedula}`);
    const buffer = await generarReporteCertificados({ cedula });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte_usuario_${cedula}_${Date.now()}.xlsx"`
    );

    res.send(buffer);
  } catch (error) {
    console.error('Error al generar el reporte por cédula:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el reporte por cédula',
      error: error.message,
    });
  }
};

module.exports = {
  descargarReporteMovilizaciones,
  descargarReportePorCedula,
  obtenerDatosGrafico,
  obtenerDatosGraficoGlobal,
};
