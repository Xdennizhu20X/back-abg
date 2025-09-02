const { Movilizacion, Animal, Ave, Transporte, Predio, Usuario } = require('../models');
const { generarCertificadoPDF } = require('../utils/pdfCertificado');
const { transformarDatosParaCertificado } = require('../helpers/movilizacion.helpers');
const { Op } = require('sequelize');
const fs = require('fs'); // Agrega esta línea con las otras importaciones
const path = require('path');
const { sendEmail } = require('../utils/mailer');

const registrarMovilizacionCompleta = async (req, res) => {
  const t = await Movilizacion.sequelize.transaction();
  try {
    const {
      fecha,
      // Los datos del solicitante se reciben pero no se usan según la última instrucción
      // nombre_solicitante,
      // cedula_solicitante,
      // telefono_solicitante,
      animales,
      aves,
      predio_origen,
      destino,
      transporte
    } = req.body;

    const usuario_id = req.usuario?.id;
    if (!usuario_id) {
      await t.rollback();
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    // --- Creación de Predios (Corregido) ---
    const origen = await Predio.create({
      ...predio_origen, // Guarda todos los campos que coincidan con el modelo
      usuario_id,
      tipo: 'origen'
    }, { transaction: t });

    const destinoPredio = await Predio.create({
      ...destino,
      nombre: destino.nombre_predio, // Mapea nombre_predio a nombre
      usuario_id,
      tipo: 'destino'
    }, { transaction: t });


    // --- Creación de Movilización (sin datos de solicitante) ---
    const movilizacion = await Movilizacion.create({
      usuario_id,
      fecha_solicitud: fecha,
      estado: 'pendiente',
      predio_origen_id: origen.id,
      predio_destino_id: destinoPredio.id,
    }, { transaction: t });

    // --- Creación de Animales (Más robusto) ---
    if (Array.isArray(animales)) {
      for (const animal of animales) {
        await Animal.create({ 
          ...animal,
          movilizacion_id: movilizacion.id, 
          identificador: animal.identificador || animal.identificacion, // Acepta ambos nombres
        }, { transaction: t });
      }
    }

    // --- Creación de Aves (Más robusto) ---
    if (aves && Array.isArray(aves) && aves.length > 0) {
      for (const ave of aves) {
        await Ave.create({ 
          ...ave,
          movilizacion_id: movilizacion.id, 
          numero_galpon: ave.numero_galpon || ave.galpon, // Acepta ambos nombres
          total_aves: ave.total_aves || ave.total,         // Acepta ambos nombres
        }, { transaction: t });
      }
    }

    // --- Creación de Transporte (Más robusto) ---
    if (transporte) {
      await Transporte.create({
        ...transporte,
        movilizacion_id: movilizacion.id,
        es_terrestre: transporte.es_terrestre || transporte.tipo_via === 'terrestre',
      }, { transaction: t });
    }

    await t.commit();

    // Enviar correos de notificación
    try {
      const solicitante = await Usuario.findByPk(usuario_id);
      const attachments = [{
        filename: 'nuevologo.png',
        path: path.join(__dirname, '..', 'utils', 'assets', 'nuevo_ecuador.png'),
        cid: 'nuevo_ecuador'
      }];

      // 1. Notificación al usuario que registra
      if (solicitante) {
        const userHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:nuevo_ecuador" alt="Logo" style="width: 150px;"/>
            </div>
            <h2 style="color: #333; text-align: center;">Registro de Movilización Exitoso</h2>
            <p>Hola ${solicitante.nombre},</p>
            <p>Tu solicitud de movilización con ID <strong>${movilizacion.id}</strong> ha sido registrada correctamente.</p>
            <p>Desde: ${origen.nombre}</p>
            <p>Hacia: ${destinoPredio.nombre}</p>
            <p>Puedes ver el estado de tu solicitud en la plataforma.</p>
            <p>Saludos,<br>El equipo de Soporte</p>
          </div>
        `;
        await sendEmail(solicitante.email, `Registro Exitoso - Movilización #${movilizacion.id}`, userHtml, attachments);
      }

      // 2. Notificación a los administradores
      const admins = await Usuario.findAll({ where: { rol: 'admin' } });
      if (admins && admins.length > 0) {
        const adminEmails = admins.map(admin => admin.email);
        const adminHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:nuevo_ecuador" alt="Logo" style="width: 150px;"/>
            </div>
            <h2 style="color: #333; text-align: center;">Nueva Movilización Registrada</h2>
            <p>Se ha registrado una nueva solicitud de movilización.</p>
            <p><strong>Detalles:</strong></p>
            <ul>
              <li><strong>ID Movilización:</strong> ${movilizacion.id}</li>
              <li><strong>Solicitante:</strong> ${solicitante ? solicitante.nombre : 'N/A'} (${solicitante ? solicitante.email : 'N/A'})</li>
              <li><strong>Predio Origen:</strong> ${origen.nombre} (${origen.localidad}, ${origen.parroquia})</li>
              <li><strong>Predio Destino:</strong> ${destinoPredio.nombre} (${destinoPredio.parroquia}, ${destinoPredio.ubicacion})</li>
              <li><strong>Fecha Solicitud:</strong> ${new Date(fecha).toLocaleDateString()}</li>
            </ul>
            <p>Por favor, revisa la solicitud en el panel de administración.</p>
          </div>
        `;
        await sendEmail(adminEmails, `Nueva Movilización para Revisión - #${movilizacion.id}`, adminHtml, attachments);
      }

    } catch (emailError) {
      console.error('Error al enviar correos de notificación de movilización:', emailError);
      // No interrumpir el flujo principal si los correos fallan
    }

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

    // Validar si existe el usuario y su email
    if (!movilizacion.Usuario || !movilizacion.Usuario.email) {
      console.warn('No se encontró email del usuario asociado a la movilización');
      return res.status(200).json({
        success: true,
        message: `Estado actualizado a ${nuevoEstado}, pero no se pudo enviar correo: usuario no tiene email.`,
        movilizacion
      });
    }

    const usuarioEmail = movilizacion.Usuario.email;
    const asunto = `Movilización ${nuevoEstado}`;
    const fechaActual = new Date().toLocaleString();

    const attachments = [{
      filename: 'nuevologo.png',
      path: path.join(__dirname, '..', 'utils', 'assets', 'nuevo_ecuador.png'),
      cid: 'nuevo_ecuador'
    }];

    let mensaje = '';

    if (nuevoEstado === 'alerta') {
      mensaje = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:nuevo_ecuador" alt="Logo" style="width: 150px;"/>
          </div>
          <h2>🚨 Alerta en Movilización</h2>
          <p>La movilización desde <strong>${movilizacion.predio_origen?.nombre}</strong> hacia 
          <strong>${movilizacion.predio_destino?.nombre}</strong> ha sido marcada como <strong>ALERTA</strong>.</p>
          <p><strong>Fecha:</strong> ${fechaActual}</p>
          <p>Por favor, tome las acciones necesarias.</p>
        </div>
      `;
    } else {
      mensaje = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:nuevo_ecuador" alt="Logo" style="width: 150px;"/>
          </div>
          <h2>✅ Movilización Finalizada</h2>
          <p>La movilización desde <strong>${movilizacion.predio_origen?.nombre}</strong> hacia 
          <strong>${movilizacion.predio_destino?.nombre}</strong> ha sido <strong>FINALIZADA</strong>.</p>
          <p><strong>Fecha de finalización:</strong> ${fechaActual}</p>
        </div>
      `;
    }

    // Enviar correo con manejo de error
    try {
      console.log(`Enviando correo a ${usuarioEmail}...`);
      await sendEmail(usuarioEmail, asunto, mensaje, attachments);
      console.log('Correo enviado con éxito.');
    } catch (emailError) {
      console.error('Error al enviar el correo:', emailError.message);
      return res.status(500).json({
        success: false,
        message: 'Estado actualizado, pero hubo un error al enviar el correo',
        movilizacion
      });
    }

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
      
      const attachments = [{
        filename: 'nuevologo.png',
        path: path.join(__dirname, '..', 'utils', 'assets', 'nuevo_ecuador.png'),
        cid: 'nuevo_ecuador'
      }];

      // Enviar emails de notificación
      for (const mov of movilizaciones) {
        const asunto = 'Alerta Automática: Movilización Pendiente por 72 horas';
        const mensaje = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:nuevo_ecuador" alt="Logo" style="width: 150px;"/>
            </div>
            <h2>Alerta Automática</h2>
            <p>La movilización desde ${mov.predio_origen.nombre} hacia 
            ${mov.predio_destino.nombre} ha sido marcada como ALERTA automáticamente 
            por haber permanecido más de 72 horas en estado pendiente.</p>
            <p>Fecha: ${new Date().toLocaleString()}</p>
            <p>Por favor, tome las acciones necesarias.</p>
          </div>
        `;
        
        await sendEmail(mov.Usuario.email, asunto, mensaje, attachments);
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
        { model: Animal, as: 'Animals' },
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

    const datosCertificado = transformarDatosParaCertificado(movilizacion);

    // Generar PDF
    const pdfBytes = await generarCertificadoPDF(datosCertificado);
    
    // Elimina el guardado temporal para diagnóstico (puede causar problemas)
    // fs.writeFileSync(`certificado_${id}.pdf`, pdfBytes);

    // Configurar headers correctamente
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificado_${id}.pdf"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Enviar el PDF directamente
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error detallado al generar el certificado de movilización:', error);
    res.status(500).json({
      success: false,
      message: 'Ocurrió un error inesperado al generar el certificado. Por favor, contacte a soporte.',
      error: error.message 
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