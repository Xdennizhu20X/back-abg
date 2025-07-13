const { Movilizacion, Animal, Ave, Transporte, Predio, Usuario, Validacion  } = require('../models');
const { Op } = require('sequelize');

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
        { model: Usuario, attributes: ['id', 'nombre', 'email'] },
        {
          model: Validacion, // 👈 Agregado aquí
          attributes: {
            exclude: ['createdAt', 'updatedAt'] // opcional si quieres excluir estos campos
          }
        }
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
        },
        {
          model: Validacion, // 👈 Agregado aquí
          attributes: {
            exclude: ['createdAt', 'updatedAt'] // opcional si quieres excluir estos campos
          }
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


const updateMovilizacion = async (req, res) => {
  try {
    const { estado, observaciones_tecnico } = req.body;
    const movilizacion = await Movilizacion.findByPk(req.params.id);

    if (!movilizacion) {
      return res.status(404).json({ error: 'Movilización no encontrada.' });
    }

    if (req.usuario.rol !== 'tecnico' && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'No tiene permiso para actualizar movilizaciones.' });
    }

    await movilizacion.update({
      estado,
      observaciones_tecnico,
      tecnico_id: req.usuario.id,
      fecha_aprobacion: estado === 'aprobado' ? new Date() : null
    });

    res.json(movilizacion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const rechazarMovilizacion = async (req, res) => {
  const t = await Validacion.sequelize.transaction();

  try {
    const { observaciones_tecnico, firma_tecnico } = req.body;
    const movilizacion = await Movilizacion.findByPk(req.params.id);

    if (!movilizacion) {
      await t.rollback();
      return res.status(404).json({ error: 'Movilización no encontrada.' });
    }

    // Verificar permisos (solo técnico o admin puede rechazar)
    if (req.usuario.rol !== 'tecnico' && req.usuario.rol !== 'admin') {
      await t.rollback();
      return res.status(403).json({ error: 'No tiene permiso para rechazar movilizaciones.' });
    }

    const nombreTecnico = req.usuario.nombre || 'Técnico Desconocido';

    // Actualizar movilización a "rechazado"
    await movilizacion.update({
      estado: 'rechazado',
      observaciones_tecnico,
      tecnico_id: req.usuario.id,
      fecha_aprobacion: null
    }, { transaction: t });

    // Registrar validación incluso si fue rechazada
    await Validacion.create({
      movilizacion_id: movilizacion.id,
      tiempo_validez: null,
      hora_inicio: null,
      hora_fin: null,
      firma_tecnico,
      nombre_tecnico: nombreTecnico,
      fecha_emision: new Date()
    }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Movilización rechazada y validación registrada',
      movilizacion
    });

  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, error: error.message });
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
        [Op.iLike]: `%${nombre}%` // para búsquedas parciales sin distinción entre mayúsculas y minúsculas
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
        },
        {
          model: Validacion, // 👈 Agregado aquí
          attributes: {
            exclude: ['createdAt', 'updatedAt'] // opcional si quieres excluir estos campos
          }
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

const registrarValidacion = async (req, res) => {
  const t = await Validacion.sequelize.transaction();

  try {
    const movilizacion_id = req.params.id;
    const {
      tiempo_validez,
      hora_inicio,
      hora_fin,
      firma_tecnico
    } = req.body;

    // Validar rol
    if (!req.usuario || (req.usuario.rol !== 'tecnico' && req.usuario.rol !== 'admin')) {
      await t.rollback();
      return res.status(403).json({ error: 'No autorizado para validar esta movilización.' });
    }

    const nombreTecnico = req.usuario.nombre || 'Técnico Desconocido';

    // Verificar que la movilización exista
    const movilizacion = await Movilizacion.findByPk(movilizacion_id);
    if (!movilizacion) {
      await t.rollback();
      return res.status(404).json({ error: 'Movilización no encontrada' });
    }

    // Buscar si ya existe validación para esa movilización
    let validacion = await Validacion.findOne({ where: { movilizacion_id } });

    if (validacion) {
      await validacion.update({
        tiempo_validez,
        hora_inicio,
        hora_fin,
        firma_tecnico,
        nombre_tecnico: nombreTecnico,
        fecha_emision: new Date()
      }, { transaction: t });

      await movilizacion.update({ estado: 'aprobado' }, { transaction: t });
    } else {
      validacion = await Validacion.create({
        movilizacion_id,
        tiempo_validez,
        hora_inicio,
        hora_fin,
        firma_tecnico,
        nombre_tecnico: nombreTecnico,
        fecha_emision: new Date()
      }, { transaction: t });

      await movilizacion.update({ estado: 'aprobado' }, { transaction: t });
    }

    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Validación registrada correctamente',
      validacion
    });

  } catch (error) {
    await t.rollback();
    console.error('Error en registrar validación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar la validación',
      error: error.message
    });
  }
};

// controllers/movilizacionController.js
const getAnimalesByMovilizacionId = async (req, res) => {
  try {
    const { id } = req.params; // ID de la movilización

    // Verificar si existe la movilización
    const movilizacion = await Movilizacion.findByPk(id);
    if (!movilizacion) {
      return res.status(404).json({
        success: false,
        message: 'Movilización no encontrada'
      });
    }

    // Obtener animales asociados
    const animales = await Animal.findAll({
      where: { movilizacion_id: id },
      attributes: ['id', 'especie', 'sexo', 'edad', 'identificacion', 'observaciones'],
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


module.exports = {
  registrarMovilizacionCompleta,
  getMovilizaciones,
  getMovilizacionById,
  updateMovilizacion,
  filtrarMovilizaciones,
  registrarValidacion,
  rechazarMovilizacion,
  getTotalPendientes,
  getAnimalesByMovilizacionId 
};