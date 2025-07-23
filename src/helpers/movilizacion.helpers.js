function transformarDatosParaCertificado(movilizacion) {
  const datosAdicionales = movilizacion.datos_adicionales || {};
  const transporte = movilizacion.Transporte || {};
  const usuario = movilizacion.Usuario || {};
  const predioOrigen = movilizacion.predio_origen || {};
  const predioDestino = movilizacion.predio_destino || {};
  
  return {
    numeroCertificado: movilizacion.id.toString().padStart(6, '0'),
    isla: "SANTA CRUZ", // Valor por defecto o tomar de algún campo
    fecha: new Date(movilizacion.fecha_solicitud).toISOString().split('T')[0],
    nombre: usuario.nombre || datosAdicionales.nombre_solicitante || 'No especificado',
    ci: usuario.ci || datosAdicionales.cedula_solicitante || '',
    telefono: usuario.telefono || datosAdicionales.telefono_solicitante || '',
    provincia: "Galápagos",
    
    // Origen (usando la estructura que espera el PDF)
    origen: {
      predio: predioOrigen.nombre || '',
      parroquia: predioOrigen.parroquia || '',
      localidad: predioOrigen.ubicacion || ''
    },
    
    // Destino (ajustado a lo que espera el PDF)
    destino: {
      centroFaenamiento: predioDestino.es_centro_faenamiento ? "Si" : "No",
      ubicacion: predioDestino.ubicacion || '',
      predio: predioDestino.nombre || '',
      nombrePredio: predioDestino.nombre || '',
      direccion: predioDestino.direccion || '',
      parroquia: predioDestino.parroquia || ''
    },
    
    // Transporte (ajustado a la estructura esperada)
    transporte: {
      tipo: transporte.tipo_transporte || 'Terrestre',
      nombreTransportista: transporte.nombre_transportista || '',
      placa: transporte.placa || '',
      cedula: transporte.cedula_transportista || '',
      telefono: transporte.telefono_transportista || '',
      detalleOtro: transporte.detalle_otro || ''
    },
    
    // Animales
    animales: (movilizacion.Animals || []).map(animal => ({
      identificacion: animal.identificador || 'N/A',
      categoria: animal.categoria || '',
      raza: animal.raza || '',
      sexo: animal.sexo || 'M',
      color: animal.color || '',
      edad: animal.edad?.toString() || '0',
      comerciante: animal.comerciante || '',
      observaciones: animal.observaciones || ''
    })),
    
    // Aves
    aves: (movilizacion.Aves || []).map(ave => ({
      galpon: ave.numero_galpon || '',
      categoria: ave.categoria || '',
      edad: ave.edad?.toString() || '0',
      total: ave.total_aves?.toString() || '0',
      observaciones: ave.observaciones || ''
    })),
    
    // Validez (valores por defecto)
    validez: {
      tiempo: "48 horas",
      desde: "08:00",
      hasta: "20:00",
      fechaEmision: new Date().toISOString().split('T')[0]
    },
    
    // Firmas
    firmas: {
      medico: "Técnico Responsable",
      interesado: usuario.nombre || datosAdicionales.nombre_solicitante || ''
    }
  };
}

module.exports = {
  transformarDatosParaCertificado
};