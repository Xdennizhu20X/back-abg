const { Usuario } = require('../models');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../utils/mailer');
const path = require('path');

const aprobarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (usuario.estado === 'activo') {
        return res.status(400).json({ success: false, message: 'El usuario ya se encuentra activo' });
    }

    usuario.estado = 'activo';
    await usuario.save();

    // Notificar al usuario por correo
    try {
      const attachments = [{
        filename: 'nuevologo.png',
        path: path.join(__dirname, '..', 'utils', 'assets', 'nuevo_ecuador.png'),
        cid: 'nuevo_ecuador'
      }];
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:nuevo_ecuador" alt="Logo" style="width: 150px;"/>
            </div>
            <h2 style="color: #333; text-align: center;">¡Tu cuenta ha sido aprobada!</h2>
            <p>Hola ${usuario.nombre},</p>
            <p>¡Buenas noticias! Un administrador ha aprobado tu cuenta. Ya puedes iniciar sesión en la plataforma con tu correo y contraseña.</p>
            <p>¡Gracias por unirte!</p>
            <p>Saludos,<br>El equipo de Soporte</p>
        </div>
      `;
      await sendEmail(usuario.email, 'Tu cuenta ha sido activada', emailHtml, attachments);
    } catch (emailError) {
      console.error('Error al enviar el correo de aprobación:', emailError);
    }

    res.json({ success: true, message: 'Usuario aprobado y notificado correctamente' });

  } catch (error) {
    console.error('Error al aprobar usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Registrar un nuevo usuario
const registrarUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    // Crear el nuevo usuario
    const usuario = await Usuario.create({
      nombre,
      email,
      password,
      rol: rol || 'ganadero' // Por defecto, si no se especifica, será ganadero
    });

    // Generar token JWT  
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Enviar respuesta sin incluir la contraseña
    const usuarioResponse = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      fecha_registro: usuario.fecha_registro
    };

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        usuario: usuarioResponse,
        token
      }
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar el usuario',
      error: error.message
    });
  }
};

// Obtener perfil del usuario actual
const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el perfil',
      error: error.message
    });
  }
};

const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['password'] }
    });
    res.json({
      success: true,
      data: usuarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

// Actualizar un usuario
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, telefono } = req.body;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    usuario.nombre = nombre || usuario.nombre;
    usuario.email = email || usuario.email;
    usuario.rol = rol || usuario.rol;
    usuario.telefono = telefono || usuario.telefono;

    await usuario.save();

    const usuarioResponse = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      fecha_registro: usuario.fecha_registro,
      telefono: usuario.telefono, 
    };

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuarioResponse
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el usuario',
      error: error.message
    });
  }
};

// Eliminar un usuario
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await usuario.destroy();

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el usuario',
      error: error.message
    });
  }
};

const rechazarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (usuario.estado !== 'pendiente') {
      return res.status(400).json({ success: false, message: 'Solo se puede rechazar un usuario con estado pendiente' });
    }

    const userEmail = usuario.email;
    const userName = usuario.nombre;

    try {
      const attachments = [{
        filename: 'nuevologo.png',
        path: path.join(__dirname, '..', 'utils', 'assets', 'nuevo_ecuador.png'),
        cid: 'nuevo_ecuador'
      }];
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:nuevo_ecuador" alt="Logo" style="width: 150px;"/>
            </div>
            <h2 style="color: #333; text-align: center;">Solicitud de Registro Rechazada</h2>
            <p>Hola ${userName},</p>
            <p>Lamentamos informarte que tu solicitud de registro para la plataforma ha sido rechazada por un administrador.</p>
            <p>Si crees que esto es un error, por favor, contacta con el soporte.</p>
            <p>Saludos,<br>El equipo de Soporte</p>
        </div>
      `;
      await sendEmail(userEmail, 'Tu solicitud de registro ha sido rechazada', emailHtml, attachments);
    } catch (emailError) {
      console.error('Error al enviar el correo de rechazo:', emailError);
    }

    await usuario.destroy();

    res.json({ success: true, message: 'Usuario rechazado y eliminado correctamente' });

  } catch (error) {
    console.error('Error al rechazar usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = {
  registrarUsuario,
  obtenerPerfil,
  obtenerUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  aprobarUsuario,
  rechazarUsuario,
}; 