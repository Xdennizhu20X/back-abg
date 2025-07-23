const { Movilizacion, Animal, Ave, Transporte, Predio, Usuario } = require('../models');
const { generarCertificadoPDF } = require('../utils/pdfCertificado');
const { transformarDatosParaCertificado } = require('../helpers/movilizacion.helpers');
const { Op } = require('sequelize');
const fs = require('fs'); // Agrega esta línea con las otras importaciones
const { sendEmail } = require('../utils/mailer');

const registrarMovilizacionCompleta = async (req, res) => {
  const t = await Movilizacion.sequelize.transaction();
  try {
    const {
      fecha,
      nombre_solicitante,
      cedula_solicitante,
      telefono_solicitante,
      animales,
      aves,
      predio_origen,
      destino,
      transporte,
      datos_adicionales
    } = req.body;

    const usuario_id = req.usuario?.id;
    if (!usuario_id) {
      await t.rollback();
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    if (!predio_origen?.parroquia || !predio_origen?.nombre) {
      await t.rollback();
      return res.status(400).json({ message: 'Datos incompletos en predio de origen' });
    }
    if (!destino?.parroquia || !destino?.nombre_predio) {
      await t.rollback();
      return res.status(400).json({ message: 'Datos incompletos en predio de destino' });
    }

    const origen = await Predio.create({
      nombre: predio_origen.nombre,
      parroquia: predio_origen.parroquia,
      ubicacion: predio_origen.ubicacion || null,
      tipo: 'origen',
      datos_adicionales: predio_origen.datos_adicionales || null,
      usuario_id
    }, { transaction: t });

    const centroFaenamientoStr = destino.centro_faenamiento; // "Si" o "No"
    const centroFaenamientoBool = centroFaenamientoStr === 'Si'; 

    const destinoPredio = await Predio.create({
      nombre: destino.nombre_predio,
      parroquia: destino.parroquia,
      ubicacion: destino.direccion || destino.ubicacion || null,
      tipo: 'destino',
      usuario_id
    }, { transaction: t });

    const movilizacion = await Movilizacion.create({
      usuario_id,
      fecha_solicitud: fecha,
      estado: 'pendiente',
      predio_origen_id: origen.id,
      predio_destino_id: destinoPredio.id,
      datos_adicionales: {
        nombre_solicitante,
        cedula_solicitante,
        telefono_solicitante,
        provincia: "Galápagos",
        destino: {
          centro_faenamiento: centroFaenamientoBool,
          referencia: destino.direccion
        },
        datos_predio_origen: predio_origen,
        datos_adicionales
      }
    }, { transaction: t });

    if (Array.isArray(animales)) {
      for (const animal of animales) {
        await Animal.create({ movilizacion_id: movilizacion.id, ...animal }, { transaction: t });
      }
    }

    if (aves && Array.isArray(aves) && aves.length > 0) {
      for (const ave of aves) {
        await Ave.create({ movilizacion_id: movilizacion.id, ...ave }, { transaction: t });
      }
    }

    if (transporte) {
      await Transporte.create({
        movilizacion_id: movilizacion.id,
        tipo_via: transporte.tipo_via,
        tipo_transporte: transporte.tipo_transporte || null,
        nombre_transportista: transporte.nombre_transportista || null,
        cedula_transportista: transporte.cedula_transportista || null,
        placa: transporte.placa || null,
        telefono_transportista: transporte.telefono_transportista || null,
        detalle_otro: transporte.detalle_otro || null
      }, { transaction: t });
    }

    await t.commit();
    res.status(201).json({
      success: true,
      message: 'Movilización registrada correctamente',
      movilizacion_id: movilizacion.id
    });

  } catch (error) {
    await t.rollback();
    console.error('Error al registrar movilización:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar la movilización',
      error: error.message
    });
  }
};

const getMovilizaciones = async (req, res) => {
  try {
    const { estado, fecha_inicio, fecha_fin } = req.query;
    const where = {};

    if (estado) where.estado = estado;
    if (fecha_inicio && fecha_fin) {
      where.fecha_solicitud = {
        [Op.between]: [fecha_inicio, fecha_fin]
      };
    }

    const movilizaciones = await Movilizacion.findAll({
      where,
      include: [
        { model: Animal },
        { model: Ave },
        { model: Transporte },
        { model: Predio, as: 'predio_origen' },
        { model: Predio, as: 'predio_destino' },
        { model: Usuario, attributes: ['id', 'nombre', 'email'] }
      ],
      order: [['fecha_solicitud', 'DESC']]
    });

    res.json(movilizaciones);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTotalPendientes = async (req, res) => {
  try {
    const totalPendientes = await Movilizacion.count({
      where: { estado: 'pendiente' }
    });

    res.json({ totalPendientes });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMovilizacionById = async (req, res) => {
  try {
    const movilizacion = await Movilizacion.findByPk(req.params.id, {
      include: [
        { model: Animal },
        { model: Ave },
        { model: Transporte },
        { model: Predio, as: 'predio_origen' },
        { model: Predio, as: 'predio_destino' },
        {
          model: Usuario,
          attributes: ['id', 'nombre', 'email', 'ci', 'telefono']
        }
      ]
    });

    if (!movilizacion) {
      return res.status(404).json({ error: 'Movilización no encontrada.' });
    }

    res.json(movilizacion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const filtrarMovilizaciones = async (req, res) => {
  try {
    const { estado, nombre, fecha_inicio, fecha_fin } = req.query;

    const where = {};
    const usuarioWhere = {};

    if (estado) where.estado = estado;

    if (fecha_inicio && fecha_fin) {
      where.fecha_solicitud = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)]
      };
    }

    if (nombre) {
      usuarioWhere.nombre = {
        [Op.iLike]: `%${nombre}%`
      };
    }

    const movilizaciones = await Movilizacion.findAll({
      where,
      include: [
        { model: Animal },
        { model: Ave },
        { model: Transporte },
        { model: Predio, as: 'predio_origen' },
        { model: Predio, as: 'predio_destino' },
        {
          model: Usuario,
          attributes: ['id', 'nombre', 'email'],
          where: Object.keys(usuarioWhere).length ? usuarioWhere : undefined
        }
      ],
      order: [['fecha_solicitud', 'DESC']]
    });

    res.json(movilizaciones);
  } catch (error) {
    console.error('Error al filtrar movilizaciones:', error);
    res.status(500).json({ error: error.message });
  }
};

const getAnimalesByMovilizacionId = async (req, res) => {
  try {
    const { id } = req.params;

    const movilizacion = await Movilizacion.findByPk(id);
    if (!movilizacion) {
      return res.status(404).json({
        success: false,
        message: 'Movilización no encontrada'
      });
    }

    const animales = await Animal.findAll({
      where: { movilizacion_id: id },
      attributes: ['id', 'especie', 'sexo', 'edad', 'identificador', 'observaciones'],
      order: [['especie', 'ASC'], ['edad', 'DESC']]
    });

    res.json({
      success: true,
      movilizacion_id: id,
      count: animales.length,
      animales
    });

  } catch (error) {
    console.error('Error al obtener animales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los animales',
      error: error.message
    });
  }
};

const actualizarEstadoMovilizacion = async (req, res) => {
  try {
    const { id, nuevoEstado } = req.body;
    
    if (!['finalizado', 'alerta'].includes(nuevoEstado)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Solo se permite cambiar a "alerta" o "finalizado"' 
      });
    }
    
    const movilizacion = await Movilizacion.findByPk(id, {
      include: [
        { model: Usuario, attributes: ['email', 'nombre'] },
        { model: Predio, as: 'predio_origen', attributes: ['nombre'] },
        { model: Predio, as: 'predio_destino', attributes: ['nombre'] }
      ]
    });
    
    if (!movilizacion) {
      return res.status(404).json({ 
        success: false, 
        message: 'Movilización no encontrada' 
      });
    }

    if (movilizacion.estado === 'finalizado') {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede modificar una movilización finalizada' 
      });
    }

    const updateData = {
      estado: nuevoEstado,
      ...(nuevoEstado === 'finalizado' && { 
        fecha_finalizacion: new Date(),
        ...(movilizacion.estado === 'alerta' && { fecha_resolucion_alerta: new Date() })
      }),
      ...(nuevoEstado === 'alerta' && { fecha_alerta: new Date() })
    };

    await movilizacion.update(updateData);

    // Enviar notificación por email
    const usuarioEmail = movilizacion.Usuario.email;
    const asunto = `Movilización ${nuevoEstado}`;
    let mensaje = '';

    if (nuevoEstado === 'alerta') {
      mensaje = `
        <h2>Alerta en Movilización</h2>
        <p>La movilización desde ${movilizacion.predio_origen.nombre} hacia 
        ${movilizacion.predio_destino.nombre} ha sido marcada como ALERTA.</p>
        <p>Fecha: ${new Date().toLocaleString()}</p>
        <p>Por favor, tome las acciones necesarias.</p>
      `;
    } else {
      mensaje = `
        <h2>Movilización Finalizada</h2>
        <p>La movilización desde ${movilizacion.predio_origen.nombre} hacia 
        ${movilizacion.predio_destino.nombre} ha sido FINALIZADA.</p>
        <p>Fecha de finalización: ${new Date().toLocaleString()}</p>
      `;
    }

    await sendEmail(usuarioEmail, asunto, mensaje);

    res.json({ 
      success: true,
      message: `Estado actualizado a ${nuevoEstado}`,
      movilizacion 
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al actualizar estado', 
      error: error.message 
    });
  }
};

const actualizarEstadosAutomaticos = async () => {
  try {
    const hace72Horas = new Date(Date.now() - 72 * 60 * 60 * 1000);

    // Obtener movilizaciones a actualizar con información del usuario
    const movilizaciones = await Movilizacion.findAll({
      where: {
        estado: 'pendiente',
        fecha_solicitud: { [Op.lte]: hace72Horas }
      },
      include: [
        { model: Usuario, attributes: ['email', 'nombre'] },
        { model: Predio, as: 'predio_origen', attributes: ['nombre'] },
        { model: Predio, as: 'predio_destino', attributes: ['nombre'] }
      ]
    });

    const [updated] = await Movilizacion.update(
      { 
        estado: 'alerta',
        fecha_alerta: new Date()
      },
      {
        where: {
          estado: 'pendiente',
          fecha_solicitud: { [Op.lte]: hace72Horas }
        }
      }
    );

    if (updated > 0) {
      console.log(`✔ ${updated} movilizaciones actualizadas a 'alerta' automáticamente`);
      
      // Enviar emails de notificación
      for (const mov of movilizaciones) {
        const asunto = 'Alerta Automática: Movilización Pendiente por 72 horas';
        const mensaje = `
          <h2>Alerta Automática</h2>
          <p>La movilización desde ${mov.predio_origen.nombre} hacia 
          ${mov.predio_destino.nombre} ha sido marcada como ALERTA automáticamente 
          por haber permanecido más de 72 horas en estado pendiente.</p>
          <p>Fecha: ${new Date().toLocaleString()}</p>
          <p>Por favor, tome las acciones necesarias.</p>
        `;
        
        await sendEmail(mov.Usuario.email, asunto, mensaje);
      }
    }

    return {
      success: true,
      count: updated,
      message: `Se actualizaron ${updated} movilizaciones a estado 'alerta'`
    };
  } catch (error) {
    console.error('✖ Error actualizando estados automáticamente:', error);
    return {
      success: false,
      message: 'Error actualizando estados automáticamente',
      error: error.message
    };
  }
};
const generarCertificadoMovilizacion = async (req, res) => {
  try {
    const { id } = req.params;
    
    const movilizacion = await Movilizacion.findByPk(id, {
      include: [
        { model: Animal, as: 'Animals' }, // Asegúrate de usar el alias correcto
        { model: Ave, as: 'Aves' },
        { model: Transporte },
        { model: Predio, as: 'predio_origen' },
        { model: Predio, as: 'predio_destino' },
        { model: Usuario },
      ]
    });

    if (!movilizacion) {
      return res.status(404).json({ error: 'Movilización no encontrada' });
    }

    // Transformar datos al formato que espera el PDF
    const datosCertificado = transformarDatosParaCertificado(movilizacion);
    console.log('Datos para PDF:', JSON.stringify(datosCertificado, null, 2));

    // Generar PDF
    const pdfBytes = await generarCertificadoPDF(datosCertificado);
    
    // Guardar temporalmente para diagnóstico
    fs.writeFileSync(`temp_certificado_${id}.pdf`, pdfBytes);
    console.log('PDF guardado temporalmente');

    // Enviar respuesta
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificado_${id}.pdf"`,
      'Content-Length': pdfBytes.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(pdfBytes);

  } catch (error) {
    console.error('Error al generar certificado:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  registrarMovilizacionCompleta,
  getMovilizaciones,
  getMovilizacionById,
  filtrarMovilizaciones,
  getTotalPendientes,
  getAnimalesByMovilizacionId,
  actualizarEstadoMovilizacion,
  actualizarEstadosAutomaticos,
  generarCertificadoMovilizacion 
};