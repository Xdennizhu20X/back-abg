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
      // Enmascarar la contraseña para mostrarla de forma segura
      const maskedPassword = 'x'.repeat(usuario.password.length);

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header con logo -->
          <div style="background: linear-gradient(135deg, #6e328a 0%, #4a1f5c 100%); padding: 30px 20px; text-align: center;">
            <img src="cid:nuevo_ecuador" alt="Logo ABG" style="width: 120px; height: auto; margin-bottom: 15px;"/>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">¡Cuenta Aprobada!</h1>
          </div>

          <!-- Contenido principal -->
          <div style="padding: 40px 30px;">
            <!-- Saludo personalizado -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background-color: #10b981; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 30px;">✓</span>
              </div>
              <h2 style="color: #1f2937; margin: 0; font-size: 24px; font-weight: 600;">¡Hola ${usuario.nombre}!</h2>
              <p style="color: #6b7280; margin: 10px 0 0; font-size: 16px;">Tu cuenta ha sido aprobada exitosamente</p>
            </div>

            <!-- Mensaje principal -->
            <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ¡Excelentes noticias! Un administrador ha revisado y aprobado tu solicitud de registro.
                Ya puedes acceder a la plataforma de gestión de movilización de ganado de la ABG.
              </p>
            </div>

            <!-- Credenciales de acceso -->
            <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 10px; padding: 25px; margin: 25px 0; border: 1px solid #d1d5db;">
              <h3 style="color: #374151; margin: 0 0 20px; font-size: 18px; font-weight: 600; text-align: center;">
                📋 Datos de Acceso
              </h3>
              <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="margin-bottom: 15px;">
                  <label style="display: block; color: #6b7280; font-size: 14px; font-weight: 500; margin-bottom: 5px;">📧 Correo electrónico:</label>
                  <span style="color: #1f2937; font-size: 16px; font-weight: 600; background-color: #f9fafb; padding: 8px 12px; border-radius: 6px; display: inline-block; border: 1px solid #e5e7eb;">${usuario.email}</span>
                </div>
                <div style="margin-bottom: 15px;">
                  <label style="display: block; color: #6b7280; font-size: 14px; font-weight: 500; margin-bottom: 5px;">🔐 Contraseña:</label>
                  <span style="color: #1f2937; font-size: 16px; font-weight: 600; background-color: #f9fafb; padding: 8px 12px; border-radius: 6px; display: inline-block; border: 1px solid #e5e7eb;">${maskedPassword}</span>
                </div>
                <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin-top: 15px;">
                  <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.4;">
                    🛡️ <strong>Nota de seguridad:</strong> Tu contraseña se muestra enmascarada por seguridad.
                    Utiliza la contraseña que creaste durante el registro.
                  </p>
                </div>
              </div>
            </div>

            <!-- Botón de acceso -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://51.178.31.63:3001/"
                 style="display: inline-block; background: linear-gradient(135deg, #6e328a 0%, #4a1f5c 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(110, 50, 138, 0.3); transition: all 0.3s ease;">
                🚀 Iniciar Sesión Ahora
              </a>
            </div>

            <!-- Información adicional -->
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="color: #1d4ed8; margin: 0 0 10px; font-size: 16px; font-weight: 600;">ℹ️ ¿Qué puedes hacer ahora?</h4>
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Registrar nuevas movilizaciones de ganado</li>
                <li>Consultar el estado de tus solicitudes</li>
                <li>Generar certificados y reportes</li>
                <li>Actualizar tu información de perfil</li>
              </ul>
            </div>

            <!-- Enlace directo -->
            <div style="text-align: center; margin: 25px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px;">🔗 Enlace directo a la plataforma:</p>
              <a href="http://51.178.31.63:3001/" style="color: #6e328a; font-weight: 600; text-decoration: none; word-break: break-all;">
                http://51.178.31.63:3001/
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0 0 10px; font-size: 16px; font-weight: 500;">
              ¡Bienvenido al Sistema de Gestión ABG!
            </p>
            <p style="color: #9ca3af; margin: 0; font-size: 14px; line-height: 1.5;">
              Si tienes alguna pregunta o necesitas asistencia, no dudes en contactar a nuestro equipo de soporte.<br>
              <strong>Agencia de Bioseguridad Galápagos</strong>
            </p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Este correo fue enviado automáticamente. Por favor, no respondas a este mensaje.
              </p>
            </div>
          </div>
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