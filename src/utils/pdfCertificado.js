const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function loadImageBase64(filename) {
  try {
    const imagePath = path.join(__dirname, 'assets', filename);
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }
    return null;
  } catch (error) {
    console.warn(`No se pudo cargar la imagen ${filename}:`, error.message);
    return null;
  }
}

async function generarCertificadoPDF(datos) {
  // Log de depuración para verificar los datos recibidos
  console.log('Datos recibidos para generar certificado:', JSON.stringify(datos, null, 2));
  console.log('Animales:', datos.animales);
  console.log('Aves:', datos.aves);
  console.log('Total de animales:', datos.totalAnimales);
  console.log('Total de aves:', datos.totalAves);
  console.log('Tipo de totalAnimales:', typeof datos.totalAnimales);
  console.log('Tipo de totalAves:', typeof datos.totalAves);
  
  // Calcular totales automáticamente si no se proporcionan
  if (!datos.totalAnimales && datos.animales && Array.isArray(datos.animales)) {
    datos.totalAnimales = datos.animales.length.toString();
    console.log('Total de animales calculado automáticamente:', datos.totalAnimales);
  }
  
  if (!datos.totalAves && datos.aves && Array.isArray(datos.aves)) {
    datos.totalAves = datos.aves.length.toString();
    console.log('Total de aves calculado automáticamente:', datos.totalAves);
  }
  
  // Log detallado de aves para depuración
  if (datos.aves && Array.isArray(datos.aves)) {
    console.log('Procesando aves:', datos.aves.length, 'elementos');
    datos.aves.forEach((ave, index) => {
      console.log(`Ave ${index + 1}:`, {
        numero_galpon: ave.numero_galpon,
        categoria: ave.categoria,
        edad: ave.edad,
        total_aves: ave.total_aves,
        observaciones: ave.observaciones
      });
    });
  }
  
  // Cargar imágenes como base64
  const escudoBase64 = await loadImageBase64('escudo_ecuador.png');
  const nuevoEcuadorBase64 = await loadImageBase64('nuevo_ecuador.png');

  // Generar HTML del certificado
  const htmlContent = generarHTMLCertificado(datos, escudoBase64, nuevoEcuadorBase64);

  // Usar Puppeteer para convertir HTML a PDF
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Configurar la página para A4
    await page.setViewport({ width: 794, height: 1123 }); // A4 en píxeles (96 DPI)
    
    // Establecer el contenido HTML
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generar PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

function generarHTMLCertificado(datos, escudoBase64, nuevoEcuadorBase64) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificado Zoosanitario</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 10px;
            color: #333;
        }
        .container {
            width: 100%;
            max-width: 794px; /* A4 width in pixels at 96dpi */
            margin: 0 auto;
            border: 1px solid #000;
            padding: 15px;
            box-sizing: border-box;
        }
        .header, .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }
        .header-left, .header-right {
            text-align: center;
            flex: 1;
        }
        .header-left img {
            height: 50px;
            margin-bottom: 5px;
        }
        .header-right img {
            height: 40px;
            margin-top: 5px;
        }
        .header-right p {
            font-size: 9px;
            margin: 0;
        }
        .title {
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
            border: 1px solid #000;
            padding: 5px;
        }
        .subtitle {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 3px;
        }
        .info-block {
            margin-bottom: 10px;
            line-height: 1.5;
        }
        .info-block span {
            font-weight: bold;
        }
        .info-block p {
            margin: 0;
        }
        .info-block .no-underline {
            text-decoration: none;
        }
        .info-block .underline {
            text-decoration: underline;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        table, th, td {
            border: 1px solid #000;
        }
        th, td {
            padding: 4px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
            font-size: 9px;
        }
        td {
            font-size: 9px;
        }
        .section-title {
            font-weight: bold;
            background-color: #e0e0e0;
            padding: 5px;
            margin-bottom: 10px;
            border: 1px solid #000;
            text-align: center;
            font-size: 11px;
            text-transform: uppercase;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
        }
        .checkbox-group span {
            margin-right: 10px;
            font-weight: bold;
        }
        .checkbox {
            width: 8px;
            height: 8px;
            border: 1px solid #000;
            display: inline-block;
            margin-left: 5px;
            vertical-align: middle;
        }
        .signature-block {
            display: flex;
            justify-content: space-around;
            margin-top: 30px;
            text-align: center;
        }
        .signature-item {
            width: 45%;
            border-top: 1px solid #000;
            padding-top: 5px;
            font-size: 9px;
        }
        .footer-info {
            font-size: 8px;
            text-align: center;
            margin-top: 20px;
            line-height: 1.3;
        }
        .footer-info p {
            margin: 0;
        }
        .footer-logo {
            text-align: right;
        }
        .footer-logo img {
            height: 30px;
        }
        .flex-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 15px;
            border: 1px solid #000;
            padding: 10px;
        }
        .flex-item {
            flex: 1;
            border-right: 1px solid #ccc;
            padding-right: 15px;
        }
        .flex-item:last-child {
            border-right: none;
            padding-right: 0;
        }
        .flex-item.half {
            flex: 0.5;
        }
        .flex-item.quarter {
            flex: 0.25;
        }
        .flex-item.three-quarter {
            flex: 0.75;
        }
        .flex-item label {
            font-weight: bold;
            display: block;
            margin-bottom: 2px;
        }
        .flex-item .value {
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            min-height: 12px; /* Ensure space for value */
        }
        .small-text {
            font-size: 8px;
        }
        .no-border-table {
            border: none;
        }
        .no-border-table td, .no-border-table th {
            border: none;
            padding: 2px 0;
        }
        .no-border-table .label {
            font-weight: bold;
            width: 100px; /* Fixed width for labels */
        }
        .no-border-table .value {
            border-bottom: 1px solid #000;
            flex-grow: 1;
            padding-left: 5px;
        }
        .inline-flex {
            display: flex;
            align-items: baseline;
            margin-bottom: 8px;
            min-height: 20px;
        }
        .inline-flex .label {
            font-weight: bold;
            margin-right: 5px;
            white-space: nowrap;
        }
        .inline-flex .value {
            flex-grow: 1;
            border-bottom: 1px solid #000;
            min-height: 12px;
        }
        .inline-flex .checkbox-label {
            margin-left: 10px;
            margin-right: 8px;
            font-weight: bold;
        }
        .inline-flex .checkbox-box {
            width: 12px;
            height: 12px;
            border: 1px solid #000;
            display: inline-block;
            vertical-align: middle;
            text-align: center;
            line-height: 12px;
            font-size: 10px;
            font-weight: bold;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .bold {
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <img src="${escudoBase64}" alt="Escudo del Ecuador">
                
            </div>
            <div class="header-right">
                <p>Agencia de Regulación y Control de la<br>Bioseguridad y Cuarentena para Galápagos</p>
            </div>
        </div>

        <div class="title">
            CERTIFICADO ZOOSANITARIO PARA LA MOVILIZACIÓN DE ANIMALES EN LAS ISLAS
        </div>
        <div class="subtitle">
            ${datos.isla || 'SANTA CRUZ'}
        </div>

        <div class="info-block">
            <div style="display: flex; justify-content: flex-end; margin-top: -15px; margin-bottom: -5px;">
                <div style="width: 100px; border: 1px solid #ff0000; color: #ff0000; padding: 2px 8px; text-align: center; font-weight: bold; margin-top: 5px;">
                    No. ${datos.numeroCertificado || '000000'}
                </div>
            </div>
            <p>La Agencia de Regulación y Control de la Bioseguridad y Cuarentena para Galápagos, con</p>
            <div class="inline-flex">
                <span class="label">fecha:</span>
                <span class="value">${datos.fecha || '___/___/___'}</span>
                <span class="label" style="margin-left: 20px;">autoriza al señor (a)</span>
                <span class="value" style="flex: 2;">${datos.nombre || '_________________________________________________'}</span>
            </div>
            <div class="inline-flex">
                <span class="label">con C.I. No.</span>
                <span class="value">${datos.ci || '____________________'}</span>
                <span class="label" style="margin-left: 20px;">y teléfono No.</span>
                <span class="value">${datos.telefono || '____________________'}</span>
                <span class="label" style="margin-left: 20px;">residente de la Provincia de Galápagos.</span>
            </div>
        </div>

        <div class="section-title">
            I LA MOVILIZACIÓN DE LOS SIGUIENTES ANIMALES DE LA ESPECIE
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 5%;">Ord.</th>
                    <th style="width: 20%;">Identificación</th>
                    <th style="width: 15%;">Categoría</th>
                    <th style="width: 10%;">Raza</th>
                    <th style="width: 8%;">Sexo</th>
                    <th style="width: 8%;">Color</th>
                    <th style="width: 8%;">Edad</th>
                    <th style="width: 15%;">Comerciante</th>
                    <th style="width: 11%;">Observaciones</th>
                </tr>
            </thead>
            <tbody>
                ${(datos.animales && Array.isArray(datos.animales) && datos.animales.length > 0) ? 
                    datos.animales.map((animal, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${animal.identificacion || ''}</td>
                        <td>${animal.categoria || ''}</td>
                        <td>${animal.raza || ''}</td>
                        <td>${animal.sexo || ''}</td>
                        <td>${animal.color || ''}</td>
                        <td>${animal.edad || ''}</td>
                        <td>${animal.comerciante || ''}</td>
                        <td>${animal.observaciones || ''}</td>
                    </tr>
                    `).join('') : 
                    Array.from({length: 7}, (_, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                    `).join('')
                }
                <tr>
                    <td colspan="8" class="text-right bold">Total de animales:</td>
                    <td class="text-center bold">${datos.totalAnimales ? datos.totalAnimales.toString() : '0'}</td>
                </tr>
                <!-- Debug: totalAnimales = ${datos.totalAnimales} -->
            </tbody>
        </table>

        <div class="section-title">
            Para el uso exclusivo de aves
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 5%;" rowspan="2">Ord.</th>
                    <th style="width: 15%;" rowspan="2">No. galpón</th>
                    <th colspan="2" style="width: 20%;">Categoría</th>
                    <th style="width: 10%;" rowspan="2">Edad</th>
                    <th style="width: 10%;" rowspan="2">Total de aves</th>
                    <th style="width: 40%;" rowspan="2">Observaciones</th>
                </tr>
                <tr>
                    <th style="font-size: 8px;">Engorde</th>
                    <th style="font-size: 8px;">Postura</th>
                </tr>
            </thead>
            <tbody>
                ${(datos.aves && Array.isArray(datos.aves) && datos.aves.length > 0) ? 
                    datos.aves.map((ave, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${ave.numero_galpon || ''}</td>
                        <td>${ave.categoria === 'Engorde' ? 'X' : ''}</td>
                        <td>${ave.categoria === 'Postura' ? 'X' : ''}</td>
                        <td>${ave.edad || ''}</td>
                        <td>${ave.total_aves || ''}</td>
                        <td>${ave.observaciones || ''}</td>
                    </tr>
                    `).join('') : 
                    Array.from({length: 3}, (_, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                    `).join('')
                }
                <!-- Debug: aves = ${JSON.stringify(datos.aves)} -->
                <tr>
                    <td colspan="5" class="text-right bold">Total de animales:</td>
                    <td class="text-center bold">${datos.totalAves ? datos.totalAves.toString() : '0'}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <div class="flex-row" style="margin: 2px; font-size: 8px;">
            <div class="flex-item">
                <div style="font-weight: bold; font-size: 2em;">Desde:</div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div class="inline-flex" style="margin-bottom: 0; font-size: 8px;">
                        <span class="label">Predio / granja:</span>
                        <span class="value">${datos.desdePredioGranja || ''}</span>
                    </div>
                    <div class="inline-flex" style="margin-bottom: 0; font-size: 8px;">
                        <span class="label">Parroquia:</span>
                        <span class="value">${datos.desdeParroquia || ''}</span>
                    </div>
                    <div class="inline-flex" style="margin-bottom: 0; font-size: 8px;">
                        <span class="label">Localidad / sitio / km:</span>
                        <span class="value">${datos.desdeLocalidad || ''}</span>
                    </div>
                </div>
            </div>
            <div class="flex-item">
                <div style="font-weight: bold; font-size: 2em; margin-bottom: 2px;">Datos adicionales:</div>
                <div class="inline-flex mb-0" style="justify-content: flex-end; font-size: 8px; margin-bottom: 2px;">
                    <span class="checkbox-label">Propio</span><span class="checkbox-box">${datos.destinoPropio ? 'X' : ''}</span>
                </div>
                <div class="inline-flex mb-0" style="justify-content: flex-end; font-size: 8px; margin-bottom: 2px;">
                    <span class="checkbox-label">Arrendado</span><span class="checkbox-box">${datos.destinoArrendado ? 'X' : ''}</span>
                </div>
                <div class="inline-flex mb-0" style="justify-content: flex-end; font-size: 8px; margin-bottom: 0;">
                    <span class="checkbox-label">Prestado</span><span class="checkbox-box">${datos.destinoPrestado ? 'X' : ''}</span>
                </div>
            </div>
        </div>

        <div style="font-weight: bold; font-size: 1.3em;">Destino:</div>
        <table style="width: 100%;  margin-bottom: 15px;">
            <tr>
                <td style="border: 1px solid #888; vertical-align: top; width: 40%;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="border-bottom: 1px solid #888; font-weight: bold; padding: 2px 4px;">Centro de faenamiento:</td>
                            <td style="border-bottom: 1px solid #888; padding: 2px 4px;">${datos.destinoFaenamiento || ''}</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 4px;">Ubicación:</td>
                            <td style="padding: 2px 4px;">${datos.destinoUbicacion || ''}</td>
                        </tr>
                    </table>
                </td>
                <td style="border: 1px solid #888; vertical-align: top; width: 60%;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="border-bottom: 1px solid #888; font-weight: bold; padding: 2px 4px; width: 25%;">Predio:</td>
                            <td style="border-bottom: 1px solid #888; padding: 2px 4px; width: 25%;">${datos.destinoPredio || ''}</td>
                            <td style="border-bottom: 1px solid #888; font-weight: bold; padding: 2px 4px; width: 25%;">Nombre del predio:</td>
                            <td style="border-bottom: 1px solid #888; padding: 2px 4px; width: 25%;">${datos.destinoNombrePredio || ''}</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 4px; width: 25%;">Dirección o referencia:</td>
                            <td style="padding: 2px 4px; width: 25%;">${datos.destinoDireccion || ''}</td>
                            <td style="padding: 2px 4px; width: 25%;">Parroquia:</td>
                            <td style="padding: 2px 4px; width: 25%;">${datos.destinoParroquia || ''}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <div class="section-title">
            II VÍA DE TRANSPORTE
        </div>

        <table style="width: 100%; margin-bottom: 15px; font-size: 8px;">
            <tr>
                <td style="border: 1px solid #000; padding: 3px; width: 8%; vertical-align: middle;">
                    <div style="display: inline-block; font-weight: bold;">Terrestre</div>
                    <div style="display: inline-block; width: 10px; height: 10px; border: 1px solid #000; text-align: center; line-height: 10px; font-weight: bold; font-size: 8px;">${datos.transporteTerrestre ? 'X' : ''}</div>
                </td>
                <td style="border: 1px solid #000; padding: 3px; width: 15%; font-weight: bold;" colspan="1">
                    Tipo de transporte:  ${datos.tipoTransporte || ''}
                </td>
                <td style="border: 1px solid #000; padding: 3px; width: 18%; font-weight: bold;" colspan="2">
                    Nombre del transportista: ${datos.nombreTransportista || ''}
                </td>
               
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 3px; font-weight: bold; width: 18%;">
                  
                </td>
                <td style="border: 1px solid #000; padding: 3px; width: 22%;">
                      No. matrícula / placa: ${datos.matriculaPlaca || ''}
                </td>
                <td style="border: 1px solid #000; padding: 3px; font-weight: bold; width: 18%;">
                    Cédula de identidad:  ${datos.ciTransportista || ''}
                </td>
                
                <td style="border: 1px solid #000; padding: 3px; font-weight: bold; width: 10%;">
                    Teléfono: ${datos.telefonoTransportista || ''}
                </td>
                
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 3px; width: 8%; vertical-align: middle;">
                    <div style="display: flex; align-items: center;">
                        <div style="font-weight: bold; margin-right: 5px;">Otros</div>
                        <div style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; text-align: center; line-height: 10px; font-weight: bold; font-size: 8px;">
                            ${datos.transporteOtros ? 'X' : ''}
                        </div>
                    </div>
                </td>
               
                <td style="border: 1px solid #000; padding: 3px; width: 15%; font-weight: bold;" colspan="3">
                    Detalle de otro:  ${datos.detalleOtroTransporte || ''}
                </td>
                
            </tr>
        </table>

        <div class="section-title">
            III VALIDEZ Y FIRMAS DE RESPONSABILIDAD
        </div>

        <div class="inline-flex" style="margin-bottom: 2px;">
            <span class="label">ESTA GUÍA ES VÁLIDA POR EL TIEMPO DE</span>
            <span class="value" style="flex: 1;">${datos.validezTiempo || ''}</span>
            <span class="label" style="margin-left: 4px;">A PARTIR DE LAS</span>
            <span class="value" style="flex: 0.5;">${datos.validezDesde || ''}</span>
            <span class="label" style="margin-left: 4px;">HASTA</span>
            <span class="value" style="flex: 0.5;">${datos.validezHasta || ''}</span>
        </div>
        <div class="inline-flex" style="margin-bottom: 4px;">
            <span class="label">FECHA DE EMISIÓN:</span>
            <span class="value" style="flex: 1;">${datos.fechaEmision || ''}</span>
        </div>

        <div class="signature-block" style="margin-top: 2px; margin-bottom: 2px; padding-top: 8px; padding-bottom: 8px;">
            <div class="signature-item" style="padding-top: 2px; padding-bottom: 2px; font-size: 8px;">
                <p style="margin-top: 2px; margin-bottom: 2px;">NOMBRE Y FIRMA DEL MÉDICO(A) VETERINARIO(A) / TÉCNICO</p>
            </div>
            <div class="signature-item" style="padding-top: 2px; padding-bottom: 2px; font-size: 8px;">
                <p style="margin-top: 2px; margin-bottom: 2px;">NOMBRE Y FIRMA DEL INTERESADO</p>
            </div>
        </div>
        <p class="small-text" style="margin-top: 1px; margin-bottom: 2px; font-size: 7px;">Original usuario, copia 1 centro de faenamiento, copia 2 área técnica.</p>

        <div class="footer" style="margin-top: 2px; margin-bottom: 2px; align-items: flex-end;">
            <div class="footer-info" style="font-size: 7px; margin-top: 0; line-height: 1.1;">
                <p style="margin-top: 1px; margin-bottom: 1px;">Dirección: Av. Baltra, diagonal a la gruta del Divino Niño</p>
                <p style="margin-top: 1px; margin-bottom: 1px;">Código postal: EC200350/ Puerto Ayora-Ecuador</p>
                <p style="margin-top: 1px; margin-bottom: 1px;">Teléfono: +593-5 252 7414</p>
                <p style="margin-top: 1px; margin-bottom: 1px;">www.bioseguridadgalapagos.gob.ec</p>
            </div>
            <div class="footer-logo" style="text-align: right;">
                <img src="${nuevoEcuadorBase64}" alt="El Nuevo Ecuador" style="height: 22px;">
            </div>
        </div>
    </div>
</body>
</html>`;
}

module.exports = { generarCertificadoPDF }; 
