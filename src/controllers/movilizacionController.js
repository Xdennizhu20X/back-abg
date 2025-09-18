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
        const pdfUrl = `http://51.178.31.63:3000/api/movilizaciones/${movilizacion.id}/certificado`;
        const userHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:nuevo_ecuador" alt="Logo ABG" style="width: 100px;"/>
              <h2 style="color: #333; margin-top: 20px;">Registro de Movilización Exitoso</h2>
            </div>

            <p style="color: #555;">Hola ${solicitante.nombre},</p>

            <p style="color: #555;">Tu solicitud de movilización ha sido registrada correctamente.</p>

            <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 3px solid #6e328a;">
              <p style="margin: 5px 0; color: #333;"><strong>ID Movilización:</strong> #${movilizacion.id}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Origen:</strong> ${origen.nombre}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Destino:</strong> ${destinoPredio.nombre}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Fecha:</strong> ${new Date(fecha).toLocaleDateString()}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Estado:</strong> PENDIENTE</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${pdfUrl}"
                 target="_blank"
                 style="display: inline-block; background-color: #6e328a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Descargar Certificado PDF
              </a>
            </div>

            <div style="background-color: #f0f0f0; padding: 10px; margin: 20px 0; border-radius: 5px;">
              <p style="color: #666; font-size: 13px; margin: 5px 0;">
                <strong>Nota:</strong> Si el botón no funciona, copia este enlace en tu navegador:
              </p>
              <p style="background-color: #fff; padding: 8px; border: 1px solid #ddd; font-family: monospace; font-size: 11px; word-break: break-all; margin: 5px 0;">
                ${pdfUrl}
              </p>
            </div>

            <p style="color: #777; font-size: 14px;">Puedes hacer seguimiento del estado de tu solicitud en la plataforma web.</p>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #999; font-size: 12px; text-align: center;">
              Agencia de Bioseguridad Galápagos<br>
              Este es un correo automático, por favor no responder.
            </p>
          </div>
        `;
        await sendEmail(solicitante.email, `Registro Exitoso - Movilización #${movilizacion.id}`, userHtml, attachments);
      }

      // 2. Notificación a los administradores
      const admins = await Usuario.findAll({ where: { rol: 'admin' } });
      if (admins && admins.length > 0) {
        const adminEmails = admins.map(admin => admin.email);
        const pdfUrl = `http://51.178.31.63:3000/api/movilizaciones/${movilizacion.id}/certificado`;
        const dashboardUrl = `http://51.178.31.63:3001/dashboard`;

        const adminHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:nuevo_ecuador" alt="Logo ABG" style="width: 100px;"/>
              <h2 style="color: #333; margin-top: 20px;">Nueva Movilización para Revisión</h2>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin-bottom: 20px;">
              <p style="color: #856404; margin: 0;">
                <strong>Acción requerida:</strong> Nueva solicitud de movilización pendiente de revisión.
              </p>
            </div>

            <h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Información del Solicitante</h3>
            <p style="color: #333; margin: 5px 0;"><strong>Nombre:</strong> ${solicitante ? solicitante.nombre : 'N/A'}</p>
            <p style="color: #333; margin: 5px 0;"><strong>Email:</strong> ${solicitante ? solicitante.email : 'N/A'}</p>
            <p style="color: #333; margin: 5px 0;"><strong>Rol:</strong> ${solicitante ? solicitante.rol : 'N/A'}</p>

            <h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 20px;">Detalles de la Movilización</h3>
            <div style="background-color: #f5f5f5; padding: 15px; margin: 10px 0;">
              <p style="margin: 5px 0; color: #333;"><strong>ID Movilización:</strong> #${movilizacion.id}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Origen:</strong> ${origen.nombre} (${origen.localidad || 'N/A'}, ${origen.parroquia || 'N/A'})</p>
              <p style="margin: 5px 0; color: #333;"><strong>Destino:</strong> ${destinoPredio.nombre} (${destinoPredio.parroquia || 'N/A'}, ${destinoPredio.ubicacion || 'N/A'})</p>
              <p style="margin: 5px 0; color: #333;"><strong>Fecha Solicitud:</strong> ${new Date(fecha).toLocaleDateString()}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Estado:</strong> PENDIENTE DE REVISIÓN</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <table cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="${pdfUrl}"
                       target="_blank"
                       style="display: inline-block; background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
                      Ver PDF
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="${dashboardUrl}"
                       target="_blank"
                       style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
                      Ir al Panel
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background-color: #f0f0f0; padding: 10px; margin: 20px 0; border-radius: 5px;">
              <p style="color: #666; font-size: 12px; margin: 5px 0;">
                <strong>Enlaces alternativos (si los botones no funcionan):</strong>
              </p>
              <p style="margin: 5px 0; color: #555; font-size: 12px;">PDF: ${pdfUrl}</p>
              <p style="margin: 5px 0; color: #555; font-size: 12px;">Panel: ${dashboardUrl}</p>
            </div>

            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 10px; margin: 20px 0;">
              <p style="color: #0c5460; margin: 0; font-size: 13px;">
                <strong>Recordatorio:</strong> Las solicitudes deben ser revisadas dentro de las 72 horas para evitar su cancelación automática.
              </p>
            </div>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #999; font-size: 12px; text-align: center;">
              Agencia de Bioseguridad Galápagos - Sistema de Administración<br>
              Este es un correo automático del sistema.
            </p>
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
    const { estado, nombre, fecha_inicio, fecha_fin, ci } = req.query;

    console.log('🔍 === FILTRAR MOVILIZACIONES BACKEND ===');
    console.log('📋 Query params recibidos:', { estado, nombre, fecha_inicio, fecha_fin, ci });

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

    // Agregar filtro por CI
    if (ci) {
      usuarioWhere.ci = ci;
      console.log('🔍 Filtrando por CI:', ci);
    }

    console.log('📊 Where clause para movilizaciones:', where);
    console.log('👤 Where clause para usuario:', usuarioWhere);

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
          attributes: ['id', 'nombre', 'email', 'ci', 'telefono'],
          where: Object.keys(usuarioWhere).length ? usuarioWhere : undefined
        }
      ],
      order: [['fecha_solicitud', 'DESC']]
    });

    console.log('📈 Total movilizaciones encontradas:', movilizaciones.length);
    if (movilizaciones.length > 0) {
      console.log('👤 Primer usuario encontrado:', {
        ci: movilizaciones[0].Usuario?.ci,
        nombre: movilizaciones[0].Usuario?.nombre
      });
    }

    // Preparar respuesta en formato consistente
    const response = {
      success: true,
      data: movilizaciones,
      total: movilizaciones.length
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Error al filtrar movilizaciones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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

const getEstadisticasPorEstado = async (req, res) => {
  try {
    const estadisticas = await Movilizacion.findAll({
      attributes: [
        'estado',
        [Movilizacion.sequelize.fn('COUNT', Movilizacion.sequelize.col('estado')), 'total']
      ],
      group: ['estado'],
      raw: true
    });

    // Formatear datos para el gráfico de pastel
    const datosGrafico = estadisticas.map(item => ({
      estado: item.estado,
      total: parseInt(item.total),
      // Agregar colores para cada estado
      color: item.estado === 'pendiente' ? '#fbbf24' :
             item.estado === 'finalizado' ? '#10b981' :
             item.estado === 'alerta' ? '#ef4444' : '#6b7280'
    }));

    res.json({ success: true, data: datosGrafico });
  } catch (error) {
    console.error('Error al obtener estadísticas por estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas por estado',
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
  generarCertificadoMovilizacion,
  getEstadisticasPorEstado
};