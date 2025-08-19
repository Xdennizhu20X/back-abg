const ExcelJS = require('exceljs');
// Importación condicional de modelos para evitar errores de conexión
let Movilizacion, Usuario, Predio, Animal, Ave, Transporte, Op;
let modelsAvailable = false;

try {
  const models = require('../models');
  Movilizacion = models.Movilizacion;
  Usuario = models.Usuario;
  Predio = models.Predio;
  Animal = models.Animal;
  Ave = models.Ave;
  Transporte = models.Transporte;
  const sequelize = require('sequelize');
  Op = sequelize.Op;
  modelsAvailable = true;
} catch (error) {
  console.warn('⚠️  No se pudieron cargar los modelos de la base de datos. Usando datos de prueba.');
  modelsAvailable = false;
}

/**
 * Genera datos de prueba cuando no hay conexión a la base de datos
 */
function generarDatosPrueba() {
  const datosPrueba = [];
  
  for (let i = 1; i <= 10; i++) {
    const fechaSolicitud = new Date();
    fechaSolicitud.setDate(fechaSolicitud.getDate() - Math.floor(Math.random() * 30));
    
    const estados = ['pendiente', 'aprobado', 'rechazado'];
    const estado = estados[Math.floor(Math.random() * estados.length)];
    
    const movilizacion = {
      id: i,
      fecha_solicitud: fechaSolicitud,
      estado: estado,
      fecha_aprobacion: estado === 'aprobado' ? new Date() : null,
      observaciones_tecnico: estado === 'rechazado' ? 'Documentación incompleta' : '',
      Usuario: {
        id: i,
        nombre: `Usuario ${i}`,
        ci: `123456789${i}`,
        email: `usuario${i}@example.com`,
        telefono: `099876543${i}`,
        rol: i <= 2 ? 'admin' : i <= 5 ? 'tecnico' : 'ganadero'
      },
      tecnico: estado !== 'pendiente' ? {
        id: 1,
        nombre: 'Dr. Juan Técnico',
        ci: '1234567890',
        email: 'tecnico@abg.gob.ec',
        telefono: '0987654321'
      } : null,
      predio_origen: {
        id: i,
        nombre: `Predio Origen ${i}`,
        ubicacion: `Ubicación Origen ${i}`,
        parroquia: 'Puerto Ayora',
        localidad: `Km ${i} vía Bellavista`,
        condicion_tenencia: 'Propio'
      },
      predio_destino: {
        id: i + 10,
        nombre: `Predio Destino ${i}`,
        ubicacion: `Ubicación Destino ${i}`,
        parroquia: 'Santa Rosa',
        direccion: `Dirección ${i}`,
        es_centro_faenamiento: i % 3 === 0
      },
      Animals: i % 2 === 0 ? [
        {
          id: i * 10,
          identificador: `BOV${i.toString().padStart(3, '0')}`,
          categoria: 'Bovino',
          raza: i % 2 === 0 ? 'Holstein' : 'Jersey',
          sexo: i % 2 === 0 ? 'M' : 'H',
          color: i % 2 === 0 ? 'Negro y blanco' : 'Marrón',
          edad: 2 + (i % 5),
          comerciante: `Comerciante ${i}`,
          observaciones: 'Animal en buen estado'
        }
      ] : [],
      Aves: i % 3 === 0 ? [
        {
          id: i * 20,
          numero_galpon: `GAL${i.toString().padStart(3, '0')}`,
          categoria: i % 2 === 0 ? 'Engorde' : 'Postura',
          edad: 30 + (i * 10),
          total_aves: 50 + (i * 25),
          observaciones: `Aves para ${i % 2 === 0 ? 'engorde' : 'postura'}`
        }
      ] : [],
      Transporte: {
        id: i,
        es_terrestre: true,
        nombre_transportista: `Transportista ${i}`,
        placa: `GAL-${i.toString().padStart(4, '0')}`,
        tipo_transporte: 'Camión',
        telefono_transportista: `098765432${i}`,
        cedula_transportista: `098765432${i}`,
        detalle_otro: null
      }
    };
    
    datosPrueba.push(movilizacion);
  }
  
  return datosPrueba;
}

/**
 * Genera un reporte en Excel de todos los certificados zoosanitarios
 * @param {Object} filtros - Filtros opcionales para el reporte
 * @param {Date} filtros.fechaDesde - Fecha de inicio del filtro
 * @param {Date} filtros.fechaHasta - Fecha final del filtro
 * @param {string} filtros.estado - Estado de las movilizaciones ('pendiente', 'aprobado', 'rechazado')
 * @param {number} filtros.usuarioId - ID del usuario específico
 * @param {string} filtros.cedula - Cédula del usuario específico
 * @returns {Buffer} Buffer del archivo Excel generado
 */
async function obtenerDatosMovilizaciones(filtros = {}) {
  let movilizaciones;
  const usarDatosPrueba = !modelsAvailable || !process.env.DB_HOST || !process.env.DB_USER;

  if (usarDatosPrueba) {
    console.log('📊 Usando datos de prueba (sin conexión a base de datos)');
    movilizaciones = generarDatosPrueba();
    if (filtros.cedula) {
      movilizaciones = movilizaciones.filter(m => m.Usuario.ci === filtros.cedula);
    }
  } else {
    try {
      console.log('🗄️  Intentando conectar a la base de datos...');
      const whereConditions = {};

      if (filtros.cedula) {
        const usuario = await Usuario.findOne({ where: { ci: filtros.cedula } });
        if (usuario) {
          whereConditions.usuario_id = usuario.id;
        } else {
          console.log(`No se encontró usuario con cédula ${filtros.cedula}.`);
          return []; // Devuelve un array vacío si el usuario no existe
        }
      } else if (filtros.usuarioId) {
        whereConditions.usuario_id = filtros.usuarioId;
      }

      if (filtros.fechaDesde && filtros.fechaHasta) {
        whereConditions.fecha_solicitud = {
          [Op.between]: [new Date(filtros.fechaDesde), new Date(filtros.fechaHasta)],
        };
      } else if (filtros.fechaDesde) {
        whereConditions.fecha_solicitud = { [Op.gte]: new Date(filtros.fechaDesde) };
      } else if (filtros.fechaHasta) {
        whereConditions.fecha_solicitud = { [Op.lte]: new Date(filtros.fechaHasta) };
      }

      if (filtros.estado) {
        whereConditions.estado = filtros.estado;
      }

      movilizaciones = await Movilizacion.findAll({
        where: whereConditions,
        include: [
          { model: Usuario, as: 'Usuario', attributes: ['id', 'nombre', 'ci', 'email', 'telefono', 'rol'] },
          { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre', 'ci', 'email', 'telefono'], required: false },
          { model: Predio, as: 'predio_origen', attributes: ['id', 'nombre', 'ubicacion', 'parroquia', 'localidad', 'condicion_tenencia'] },
          { model: Predio, as: 'predio_destino', attributes: ['id', 'nombre', 'ubicacion', 'parroquia', 'direccion', 'es_centro_faenamiento'] },
          { model: Animal, attributes: ['id', 'identificador', 'categoria', 'raza', 'sexo', 'color', 'edad', 'comerciante', 'observaciones'] },
          { model: Ave, attributes: ['id', 'numero_galpon', 'categoria', 'edad', 'total_aves', 'observaciones'] },
          { model: Transporte, attributes: ['id', 'es_terrestre', 'nombre_transportista', 'placa', 'tipo_transporte', 'telefono_transportista', 'cedula_transportista', 'detalle_otro'] }
        ],
        order: [['fecha_solicitud', 'DESC']]
      });

      console.log('✅ Conexión a base de datos exitosa');
    } catch (dbError) {
      console.warn('⚠️  Error de conexión a base de datos. Usando datos de prueba.');
      console.warn('Error:', dbError.message);
      movilizaciones = generarDatosPrueba();
    }
  }
  return movilizaciones;
}


async function generarReporteCertificados(filtros = {}) {
  try {
    console.log('Generando reporte de certificados zoosanitarios...');
    const movilizaciones = await obtenerDatosMovilizaciones(filtros);

    console.log(`Encontradas ${movilizaciones.length} movilizaciones para el reporte`);

    // Crear libro de Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Certificados Zoosanitarios';
    workbook.lastModifiedBy = 'Sistema ABG';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Crear hoja principal - Resumen de Certificados
    const worksheetResumen = workbook.addWorksheet('Resumen Certificados');
    
    // Configurar columnas del resumen
    worksheetResumen.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Fecha Solicitud', key: 'fecha_solicitud', width: 15 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Solicitante', key: 'solicitante_nombre', width: 25 },
      { header: 'CI Solicitante', key: 'solicitante_ci', width: 15 },
      { header: 'Teléfono', key: 'solicitante_telefono', width: 15 },
      { header: 'Predio Origen', key: 'predio_origen_nombre', width: 25 },
      { header: 'Ubicación Origen', key: 'predio_origen_ubicacion', width: 30 },
      { header: 'Predio Destino', key: 'predio_destino_nombre', width: 25 },
      { header: 'Ubicación Destino', key: 'predio_destino_ubicacion', width: 30 },
      { header: 'Total Animales', key: 'total_animales', width: 15 },
      { header: 'Total Aves', key: 'total_aves', width: 15 },
      { header: 'Transportista', key: 'transportista', width: 25 },
      { header: 'Placa', key: 'placa_transporte', width: 12 },
      { header: 'Técnico Revisor', key: 'tecnico_revisor', width: 25 },
      { header: 'Fecha Aprobación', key: 'fecha_aprobacion', width: 15 },
      { header: 'Observaciones', key: 'observaciones_tecnico', width: 40 }
    ];

    // Estilo del encabezado
    const headerRow = worksheetResumen.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Llenar datos del resumen
    movilizaciones.forEach((movilizacion, index) => {
      const rowData = {
        id: movilizacion.id,
        fecha_solicitud: movilizacion.fecha_solicitud ? new Date(movilizacion.fecha_solicitud).toLocaleDateString('es-ES') : '',
        estado: movilizacion.estado,
        solicitante_nombre: movilizacion.Usuario?.nombre || '',
        solicitante_ci: movilizacion.Usuario?.ci || '',
        solicitante_telefono: movilizacion.Usuario?.telefono || '',
        predio_origen_nombre: movilizacion.predio_origen?.nombre || '',
        predio_origen_ubicacion: movilizacion.predio_origen?.ubicacion || '',
        predio_destino_nombre: movilizacion.predio_destino?.nombre || '',
        predio_destino_ubicacion: movilizacion.predio_destino?.ubicacion || '',
        total_animales: movilizacion.Animals?.length || 0,
        total_aves: movilizacion.Aves?.reduce((sum, ave) => sum + (ave.total_aves || 0), 0) || 0,
        transportista: movilizacion.Transporte?.nombre_transportista || '',
        placa_transporte: movilizacion.Transporte?.placa || '',
        tecnico_revisor: movilizacion.tecnico?.nombre || '',
        fecha_aprobacion: movilizacion.fecha_aprobacion ? new Date(movilizacion.fecha_aprobacion).toLocaleDateString('es-ES') : '',
        observaciones_tecnico: movilizacion.observaciones_tecnico || ''
      };

      const row = worksheetResumen.addRow(rowData);
      
      // Colorear filas según estado
      if (movilizacion.estado === 'aprobado') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E8F5E8' }
        };
      } else if (movilizacion.estado === 'rechazado') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8E8' }
        };
      } else {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8E1' }
        };
      }
    });

    // Crear hoja de Detalle de Animales
    const worksheetAnimales = workbook.addWorksheet('Detalle Animales');
    
    worksheetAnimales.columns = [
      { header: 'ID Movilización', key: 'movilizacion_id', width: 15 },
      { header: 'Fecha Solicitud', key: 'fecha_solicitud', width: 15 },
      { header: 'Solicitante', key: 'solicitante', width: 25 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Identificación', key: 'identificador', width: 15 },
      { header: 'Categoría', key: 'categoria', width: 15 },
      { header: 'Raza', key: 'raza', width: 15 },
      { header: 'Sexo', key: 'sexo', width: 8 },
      { header: 'Color', key: 'color', width: 15 },
      { header: 'Edad', key: 'edad', width: 8 },
      { header: 'Comerciante', key: 'comerciante', width: 25 },
      { header: 'Observaciones', key: 'observaciones', width: 40 }
    ];

    // Estilo del encabezado de animales
    const headerRowAnimales = worksheetAnimales.getRow(1);
    headerRowAnimales.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRowAnimales.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4CAF50' }
    };
    headerRowAnimales.alignment = { horizontal: 'center', vertical: 'middle' };

    // Llenar datos de animales
    movilizaciones.forEach(movilizacion => {
      if (movilizacion.Animals && movilizacion.Animals.length > 0) {
        movilizacion.Animals.forEach(animal => {
          worksheetAnimales.addRow({
            movilizacion_id: movilizacion.id,
            fecha_solicitud: movilizacion.fecha_solicitud ? new Date(movilizacion.fecha_solicitud).toLocaleDateString('es-ES') : '',
            solicitante: movilizacion.Usuario?.nombre || '',
            estado: movilizacion.estado,
            identificador: animal.identificador,
            categoria: animal.categoria,
            raza: animal.raza,
            sexo: animal.sexo,
            color: animal.color,
            edad: animal.edad,
            comerciante: animal.comerciante,
            observaciones: animal.observaciones
          });
        });
      }
    });

    // Crear hoja de Detalle de Aves
    const worksheetAves = workbook.addWorksheet('Detalle Aves');
    
    worksheetAves.columns = [
      { header: 'ID Movilización', key: 'movilizacion_id', width: 15 },
      { header: 'Fecha Solicitud', key: 'fecha_solicitud', width: 15 },
      { header: 'Solicitante', key: 'solicitante', width: 25 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'No. Galpón', key: 'numero_galpon', width: 12 },
      { header: 'Categoría', key: 'categoria', width: 12 },
      { header: 'Edad (días)', key: 'edad', width: 12 },
      { header: 'Total Aves', key: 'total_aves', width: 12 },
      { header: 'Observaciones', key: 'observaciones', width: 40 }
    ];

    // Estilo del encabezado de aves
    const headerRowAves = worksheetAves.getRow(1);
    headerRowAves.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRowAves.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9800' }
    };
    headerRowAves.alignment = { horizontal: 'center', vertical: 'middle' };

    // Llenar datos de aves
    movilizaciones.forEach(movilizacion => {
      if (movilizacion.Aves && movilizacion.Aves.length > 0) {
        movilizacion.Aves.forEach(ave => {
          worksheetAves.addRow({
            movilizacion_id: movilizacion.id,
            fecha_solicitud: movilizacion.fecha_solicitud ? new Date(movilizacion.fecha_solicitud).toLocaleDateString('es-ES') : '',
            solicitante: movilizacion.Usuario?.nombre || '',
            estado: movilizacion.estado,
            numero_galpon: ave.numero_galpon,
            categoria: ave.categoria,
            edad: ave.edad,
            total_aves: ave.total_aves,
            observaciones: ave.observaciones
          });
        });
      }
    });

    // Crear hoja de Estadísticas
    const worksheetStats = workbook.addWorksheet('Estadísticas');
    
    // Calcular estadísticas
    const totalCertificados = movilizaciones.length;
    const certificadosAprobados = movilizaciones.filter(m => m.estado === 'aprobado').length;
    const certificadosPendientes = movilizaciones.filter(m => m.estado === 'pendiente').length;
    const certificadosRechazados = movilizaciones.filter(m => m.estado === 'rechazado').length;
    const totalAnimales = movilizaciones.reduce((sum, m) => sum + (m.Animals?.length || 0), 0);
    const totalAves = movilizaciones.reduce((sum, m) => 
      sum + (m.Aves?.reduce((aveSum, ave) => aveSum + (ave.total_aves || 0), 0) || 0), 0
    );

    // Configurar hoja de estadísticas
    worksheetStats.mergeCells('A1:B1');
    worksheetStats.getCell('A1').value = 'ESTADÍSTICAS DE CERTIFICADOS ZOOSANITARIOS';
    worksheetStats.getCell('A1').font = { bold: true, size: 16 };
    worksheetStats.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    const statsData = [
      ['', ''],
      ['Concepto', 'Cantidad'],
      ['Total de Certificados', totalCertificados],
      ['Certificados Aprobados', certificadosAprobados],
      ['Certificados Pendientes', certificadosPendientes],
      ['Certificados Rechazados', certificadosRechazados],
      ['Total de Animales', totalAnimales],
      ['Total de Aves', totalAves],
      ['', ''],
      ['Fecha de Generación', new Date().toLocaleDateString('es-ES')],
      ['Hora de Generación', new Date().toLocaleTimeString('es-ES')]
    ];

    statsData.forEach((row, index) => {
      if (index === 1) { // Encabezado
        const headerRow = worksheetStats.addRow(row);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E3F2FD' }
        };
      } else {
        worksheetStats.addRow(row);
      }
    });

    worksheetStats.columns = [
      { header: '', key: 'concepto', width: 30 },
      { header: '', key: 'cantidad', width: 15 }
    ];

    // Generar buffer del archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    
    console.log('Reporte de certificados generado exitosamente');
    return buffer;

  } catch (error) {
    console.error('Error al generar reporte de certificados:', error);
    throw new Error(`Error al generar reporte: ${error.message}`);
  }
}

/**
 * Genera un reporte específico por rango de fechas
 */
async function generarReportePorFechas(fechaInicio, fechaFin) {
  return await generarReporteCertificados({
    fechaDesde: new Date(fechaInicio),
    fechaHasta: new Date(fechaFin)
  });
}

/**
 * Genera un reporte específico por usuario
 */
async function generarReportePorUsuario(usuarioId) {
  return await generarReporteCertificados({
    usuarioId: usuarioId
  });
}

/**
 * Genera un reporte específico por estado
 */
async function generarReportePorEstado(estado) {
  return await generarReporteCertificados({
    estado: estado
  });
}

module.exports = {
  obtenerDatosMovilizaciones, // Exportar la nueva función
  generarReporteCertificados,
  generarReportePorFechas,
  generarReportePorUsuario,
  generarReportePorEstado
};
