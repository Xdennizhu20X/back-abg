const express = require('express');
const router = express.Router();
const { generarCertificadoPDF } = require('../utils/pdfCertificado');

// Endpoint de prueba simple
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Endpoint de prueba llamado');
    
    // Datos de prueba simples
    const testData = {
      numero: "TEST001",
      isla: "SANTA CRUZ",
      fecha: "2024-06-10",
      nombre: "Usuario de Prueba",
      ci: "1234567890",
      telefono: "0999999999",
      provincia: "Galápagos",
      animales: [
        {
          identificacion: "123456789012345",
          categoria: "ovino",
          raza: "criolla",
          sexo: "M",
          color: "blanco",
          edad: "2",
          comerciante: "Pedro",
          observaciones: ""
        }
      ],
      aves: [],
      predio: "Predio Test",
      parroquia: "Parroquia Test",
      localidad: "Localidad Test",
      destino: {
        centroFaenamiento: "Centro Test",
        ubicacion: "Ubicación Test",
        predio: "Predio Destino Test",
        nombrePredio: "Predio Destino",
        direccion: "Dirección Test",
        parroquia: "Parroquia Destino Test"
      },
      transporte: {
        tipo: "Terrestre",
        nombreTransportista: "Transportista Test",
        placa: "ABC-123",
        cedula: "0987654321",
        telefono: "0988888888",
        detalleOtro: ""
      },
      validez: {
        tiempo: "48 horas",
        desde: "08:00",
        hasta: "20:00",
        fechaEmision: "2024-06-10"
      },
      firmas: {
        medico: "Dr. Test",
        interesado: "Usuario Test"
      }
    };

    console.log('📋 Generando PDF con datos de prueba...');
    const pdfBytes = await generarCertificadoPDF(testData);
    console.log('✅ PDF generado exitosamente, tamaño:', pdfBytes.length, 'bytes');
    
    // Headers para forzar la descarga
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="test-certificado.pdf"',
      'Content-Length': pdfBytes.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    console.log('📤 Enviando PDF al cliente...');
    res.send(pdfBytes);
    console.log('✅ PDF enviado exitosamente');
    
  } catch (err) {
    console.error('❌ Error en endpoint de prueba:', err);
    res.status(500).json({ 
      message: 'Error al generar el PDF de prueba', 
      error: err.message,
      stack: err.stack 
    });
  }
});

router.post('/certificado', async (req, res) => {
  try {
    const datos = req.body;
    console.log('📋 Datos recibidos para generar certificado:', datos);
    
    // Validar que los datos no estén vacíos
    if (!datos || Object.keys(datos).length === 0) {
      console.error('❌ Error: No se recibieron datos');
      return res.status(400).json({ 
        message: 'No se recibieron datos para generar el certificado',
        error: 'Datos vacíos'
      });
    }
    
    // Validar que haya al menos un animal o ave
    if ((!datos.animales || datos.animales.length === 0) && 
        (!datos.aves || datos.aves.length === 0)) {
      console.error('❌ Error: No hay animales ni aves especificados');
      return res.status(400).json({ 
        message: 'Debe especificar al menos un animal o ave',
        error: 'Sin animales ni aves'
      });
    }
    
    console.log('🔧 Generando PDF...');
    const pdfBytes = await generarCertificadoPDF(datos);
    console.log('✅ PDF generado exitosamente, tamaño:', pdfBytes.length, 'bytes');
    
    // Headers para forzar la descarga
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificado_${datos.numero || '000000'}_${datos.fecha || 'sin_fecha'}.pdf"`,
      'Content-Length': pdfBytes.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    console.log('📤 Enviando PDF al cliente...');
    res.send(pdfBytes);
    console.log('✅ PDF enviado exitosamente');
    
  } catch (err) {
    console.error('❌ Error al generar certificado PDF:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ 
      message: 'Error al generar el PDF', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

router.get('/certificado', async (req, res) => {
  try {
    // Para GET, usar datos de ejemplo o query params
    const datos = req.query;
    const pdfBytes = await generarCertificadoPDF(datos);
    
    // Headers para forzar la descarga
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="certificado.pdf"',
      'Content-Length': pdfBytes.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(pdfBytes);
  } catch (err) {
    console.error('Error al generar certificado PDF:', err);
    res.status(500).json({ message: 'Error al generar el PDF', error: err.message });
  }
});

// Endpoint adicional para descarga con nombre personalizado
router.post('/certificado/descargar', async (req, res) => {
  try {
    const datos = req.body;
    const nombreArchivo = datos.nombreArchivo || 'certificado';
    console.log('Datos recibidos para generar certificado:', datos);
    
    const pdfBytes = await generarCertificadoPDF(datos);
    
    // Headers para forzar la descarga con nombre personalizado
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}.pdf"`,
      'Content-Length': pdfBytes.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Accept-Ranges': 'bytes'
    });
    
    res.send(pdfBytes);
  } catch (err) {
    console.error('Error al generar certificado PDF:', err);
    res.status(500).json({ message: 'Error al generar el PDF', error: err.message });
  }
});

module.exports = router; 