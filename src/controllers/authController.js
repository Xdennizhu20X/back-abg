const jwt = require('jsonwebtoken');
const path = require('path');
const { Usuario } = require('../models');
const { sendEmail } = require('../utils/mailer');

const generateToken = (usuario) => {
  return jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const register = async (req, res) => {
  try {
    const { nombre, email, password, rol, ci, telefono  } = req.body;

    // Validar campos requeridos
    if (!nombre || !email || !password || !ci) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios (nombre, email, password, ci)'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    // Validar longitud de la contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Validar formato de la cédula (10 dígitos numéricos)
    const ciRegex = /^\d{10}$/;
    if (!ciRegex.test(ci)) {
      return res.status(400).json({
        success: false,
        message: 'La cédula debe tener exactamente 10 dígitos numéricos'
      });
    }

    // Validar rol si se proporciona
    if (rol && !['ganadero', 'tecnico', 'admin', 'faenador'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'El rol debe ser uno de: ganadero, tecnico, admin'
      });
    }


    // Verificar si el email ya está registrado
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Verificar si la cédula ya está registrada
    const ciExistente = await Usuario.findOne({ where: { ci } });
    if (ciExistente) {
      return res.status(400).json({
        success: false,
        message: 'La cédula ya está registrada'
      });
    }

    if (telefono && !/^[\d\s+-]{7,15}$/.test(telefono)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del teléfono no es válido'
      });
    }

    // Asignar rol y estado
    const userRol = rol || 'ganadero';
    const userEstado = ['tecnico', 'faenador'].includes(userRol) ? 'pendiente' : 'activo';

    // Crear el nuevo usuario
    const usuario = await Usuario.create({
      nombre,
      email,
      password,
      rol: userRol,
      ci,
      telefono,
      estado: userEstado
    });

    const attachments = [{
      filename: 'nuevologo.png',
      path: path.join(__dirname, '..', 'assets', 'nuevologo.png'),
      cid: 'nuevo_ecuador'
    }];

    // --- Lógica de Notificación y Respuesta ---

    // 1. Para usuarios que requieren aprobación
    if (userEstado === 'pendiente') {
      // Enviar correo de bienvenida al usuario pendiente
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:nuevo_ecuador" alt="Logo" style="width: 150px;"/>
            </div>
            <h2 style="color: #333; text-align: center;">¡Registro Recibido!</h2>
            <p>Hola ${usuario.nombre},</p>
            <p>Hemos recibido tu solicitud de registro. Tu cuenta para el rol de <strong>${userRol}</strong> está actualmente pendiente de aprobación por un administrador.</p>
            <p>Te notificaremos por este medio una vez que tu cuenta sea activada.</p>
            <p>¡Gracias por tu paciencia!</p>
            <p>Saludos,<br>El equipo de Soporte</p>
          </div>
        `;
        await sendEmail(usuario.email, 'Registro Pendiente de Aprobación', emailHtml, attachments);
      } catch (emailError) {
        console.error('Error al enviar el correo de bienvenida (pendiente):', emailError);
      }

      // Notificar a los administradores
      try {
        const admins = await Usuario.findAll({ where: { rol: 'admin' } });
        if (admins && admins.length > 0) {
          const adminEmails = admins.map(admin => admin.email);
          const adminHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="cid:nuevo_ecuador" alt="Logo" style="width: 150px;"/>
              </div>
              <h2 style="color: #333; text-align: center;">Nuevo Usuario Pendiente de Aprobación</h2>
              <p>Se ha registrado un nuevo usuario que requiere aprobación.</p>
              <p><strong>Detalles del usuario:</strong></p>
              <ul>
                <li><strong>Nombre:</strong> ${usuario.nombre}</li>
                <li><strong>Email:</strong> ${usuario.email}</li>
                <li><strong>CI:</strong> ${usuario.ci}</li>
                <li><strong>Rol:</strong> ${usuario.rol}</li>
              </ul>
              <p>Por favor, ve al panel de administración para aprobar o rechazar esta solicitud.</p>
            </div>
          `;
          await sendEmail(adminEmails, 'Nuevo Usuario para Aprobación', adminHtml, attachments);
        }
      } catch (adminEmailError) {
        console.error('Error al notificar a los administradores (pendiente):', adminEmailError);
      }

      // Responder al usuario sin token
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente. Tu cuenta está pendiente de aprobación.',
        data: {
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol,
            estado: usuario.estado
          }
        }
      });

    } else {
      // 2. Para usuarios que se activan automáticamente
      // Enviar correo de bienvenida estándar
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:nuevo_ecuador" alt="Logo" style="width: 150px;"/>
            </div>
            <h2 style="color: #333; text-align: center;">¡Bienvenido a nuestra plataforma!</h2>
            <p>Hola ${usuario.nombre},</p>
            <p>Tu registro ha sido exitoso. Ahora puedes disfrutar de todos nuestros servicios.</p>
            <p>¡Gracias por unirte!</p>
            <p>Saludos,<br>El equipo de Soporte</p>
          </div>
        `;
        await sendEmail(usuario.email, 'Registro Exitoso', emailHtml, attachments);
      } catch (emailError) {
        console.error('Error al enviar el correo de bienvenida (activo):', emailError);
      }

      // Notificar a los administradores (opcional, pero mantenemos la consistencia)
      try {
        const admins = await Usuario.findAll({ where: { rol: 'admin' } });
        if (admins && admins.length > 0) {
          const adminEmails = admins.map(admin => admin.email);
          const adminHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h2 style="color: #333; text-align: center;">Nuevo Usuario Registrado</h2>
              <p>Se ha registrado un nuevo usuario en la plataforma.</p>
              <p><strong>Detalles del usuario:</strong></p>
              <ul>
                <li><strong>Nombre:</strong> ${usuario.nombre}</li>
                <li><strong>Email:</strong> ${usuario.email}</li>
                <li><strong>Rol:</strong> ${usuario.rol}</li>
                <li><strong>Estado:</strong> ${usuario.estado}</li>
              </ul>
            </div>
          `;
          await sendEmail(adminEmails, 'Nuevo Usuario Registrado', adminHtml, attachments);
        }
      } catch (adminEmailError) {
        console.error('Error al notificar a los administradores (activo):', adminEmailError);
      }

      // Generar token y responder
      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol,
            estado: usuario.estado
          },
          token
        }
      });
    }
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar el usuario',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son obligatorios'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const passwordValido = await usuario.comparePassword(password);
    if (!passwordValido) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si la cuenta está activa
    if (usuario.estado === 'pendiente') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta está pendiente de aprobación por un administrador.'
      });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const usuarioResponse = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      fecha_registro: usuario.fecha_registro
    };

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        usuario: usuarioResponse,
        token
      }
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requerido' });
    }

    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Generar token JWT para recuperación de contraseña
    const resetToken = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // válido por 15 minutos
    );

    const resetURL = `https://web-abg.vercel.app/reset-password?token=${resetToken}`;

    const html = `
      <h3>Recuperación de contraseña</h3>
      <p>Hola ${usuario.nombre},</p>
      <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
      <a href="${resetURL}">${resetURL}</a>
      <p>Este enlace expirará en 15 minutos.</p>
    `;

    await sendEmail(usuario.email, 'Recuperación de contraseña', html);

    res.json({
      success: true,
      message: 'Se envió un enlace de recuperación a tu correo electrónico.'
    });
  } catch (error) {
    console.error('Error al enviar el correo de recuperación:', error);
    res.status(500).json({ success: false, message: 'Error al enviar el correo de recuperación' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.query;
    const { nuevaPassword } = req.body;

    if (!token || !nuevaPassword) {
      return res.status(400).json({ success: false, message: 'Token y nueva contraseña requeridos' });
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // ✅ Marcar el campo como modificado para activar el hook
    usuario.password = nuevaPassword;
    usuario.changed('password', true); // <-- Esta línea es CLAVE

    await usuario.save();

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al restablecer la contraseña:', error);
    res.status(400).json({
      success: false,
      message: 'Token inválido o expirado',
      error: error.message
    });
  }
};



const getProfile = async (req, res) => {
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

module.exports = {
  register,
  login,
  logout,
  getProfile,
  forgotPassword,
  resetPassword
}; 