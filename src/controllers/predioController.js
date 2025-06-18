const { Predio } = require('../models');

const createPredio = async (req, res) => {
  try {
    const { nombre, ubicacion, tipo, latitud, longitud } = req.body;

    const nuevoPredio = await Predio.create({
      usuario_id: req.usuario.id, // asegurarse que el middleware de auth agrega req.usuario
      nombre,
      ubicacion,
      tipo,
      latitud,
      longitud
    });

    res.status(201).json(nuevoPredio);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el predio', details: error.message });
  }
};

const getTodosLosPredios = async (req, res) => {
  try {
    const predios = await Predio.findAll();
    res.json(predios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los predios', details: error.message });
  }
};

const getPrediosPorUsuario = async (req, res) => {
  try {
    const usuarioId = req.params.usuarioId;
    const predios = await Predio.findAll({
      where: { usuario_id: usuarioId }
    });
    res.json(predios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los predios por usuario', details: error.message });
  }
};

const updatePredio = async (req, res) => {
  try {
    const { id } = req.params;
    const [actualizados] = await Predio.update(req.body, {
      where: { id }
    });

    if (actualizados === 0) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }

    const predioActualizado = await Predio.findByPk(id);
    res.json(predioActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el predio', details: error.message });
  }
};

const deletePredio = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await Predio.destroy({
      where: { id }
    });

    if (!eliminado) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }

    res.json({ mensaje: 'Predio eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el predio', details: error.message });
  }
};

module.exports = {
  createPredio,
  getTodosLosPredios,
  getPrediosPorUsuario,
  updatePredio,
  deletePredio
};
