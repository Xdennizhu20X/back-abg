const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function loadImageBytes(filename) {
  try {
    return await fs.promises.readFile(path.join(__dirname, 'assets', filename));
  } catch (error) {
    console.warn(`No se pudo cargar la imagen ${filename}:`, error.message);
    return null;
  }
}

async function generarCertificadoPDF(datos) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const borderWidth = 0.5;
  const borderColor = rgb(0, 0, 0);

  // --- CARGAR IMÁGENES ---
  const escudoBytes = await loadImageBytes('escudo_ecuador.png');
  const nuevoEcuadorBytes = await loadImageBytes('nuevo_ecuador.png');
  const escudoImage = escudoBytes ? await pdfDoc.embedPng(escudoBytes) : null;
  const nuevoEcuadorImage = nuevoEcuadorBytes ? await pdfDoc.embedPng(nuevoEcuadorBytes) : null;

  // --- CABECERA ---
  if (escudoImage) {
    page.drawImage(escudoImage, { x: 45, y: 795, width: 55, height: 45 });
  }


  // Justificamos a la derecha calculando el ancho del texto y restándolo del ancho de la página (595.28)
  const texto1 = 'Agencia de Regulación y Control de la';
  const texto2 = 'Bioseguridad y Cuarentena para Galápagos';
  const size = 9;
  const pageWidth = 595.28;
  const margenDerecho = 30;

  const anchoTexto1 = font.widthOfTextAtSize(texto1, size);
  const anchoTexto2 = font.widthOfTextAtSize(texto2, size);

  page.drawText(texto1, { x: pageWidth - anchoTexto1 - margenDerecho, y: 805, size, font });
  page.drawText(texto2, { x: pageWidth - anchoTexto2 - margenDerecho, y: 795, size, font });

  let y = 775;
  const tableX = 50;
  const tableWidth = 500;

  // --- RECUADRO PRINCIPAL DEL CERTIFICADO ---
  const mainBoxHeight = 40;
  page.drawRectangle({ x: tableX, y: y - mainBoxHeight, width: tableWidth, height: mainBoxHeight, borderColor, borderWidth });
  page.drawText('CERTIFICADO ZOOSANITARIO PARA LA MOVILIZACIÓN DE ANIMALES EN LAS ISLAS', { x: tableX + 5, y: y - 15, size: 10, font: fontBold });
  
  const islaTexto = datos.isla || 'SANTA CRUZ';
  const islaAncho = fontBold.widthOfTextAtSize(islaTexto, 11);
  page.drawText(islaTexto, { x: tableX + (tableWidth - islaAncho) / 2, y: y - 30, size: 11, font: fontBold });

  const numRectW = 85;
  const numRectH = 20;
  const numRectX = tableX + tableWidth - numRectW - 8;
  page.drawRectangle({ x: numRectX, y: y - 38, width: numRectW, height: numRectH, borderColor: rgb(1,0,0), borderWidth });
  page.drawText(`No. ${datos.numeroCertificado || '000000'}`, { x: numRectX + 5, y: y - 30, size: 10, color: rgb(1,0,0), font: fontBold });
  
  y -= (mainBoxHeight + 15);

  // --- PÁRRAFO INTRODUCTORIO ---
  const introText = `La Agencia de Regulación y Control de la Bioseguridad y Cuarentena para Galápagos, con fecha: ___/___/___ autoriza al señor (a) ${datos.nombre || '____________________'}, con C.I. No. ${datos.ci || '____________________'} y teléfono No. ${datos.telefono || '____________________'}, residente de la Provincia de Galápagos.`;
  page.drawText(introText, { x: tableX, y, size: 9, font, lineHeight: 15, maxWidth: tableWidth });
  
  y -= 40;

  // --- SECCIÓN I: MOVILIZACIÓN ---
  const headerIHeight = 18;
  page.drawRectangle({ x: tableX, y, width: tableWidth, height: headerIHeight, color: rgb(0.9, 0.9, 0.9), borderColor, borderWidth });
  page.drawText('I LA MOVILIZACIÓN DE LOS SIGUIENTES ANIMALES DE LA ESPECIE', { x: tableX + 5, y: y + 5, size: 9, font: fontBold });
  page.drawRectangle({ x: tableX + tableWidth - 100, y, width: 100, height: headerIHeight, borderColor, borderWidth });
  
  y -= headerIHeight;
  
  // --- TABLA ANIMALES ---
  const headers = ['Ord.', 'Identificación', 'Categoría', 'Raza', 'Sexo', 'Color', 'Edad', 'Comerciante', 'Observaciones'];
  const colWidths = [30, 80, 65, 50, 35, 45, 35, 75, 85];
  const rowHeight = 15;
  // Reducimos espacio entre el título y la cabecera de la tabla
  y += rowHeight;  // antes se dejaba una fila vacía (15 px)
  const numRows = 7;
  
  let currentX = tableX;
  headers.forEach((header, i) => {
    page.drawRectangle({ x: currentX, y: y - rowHeight, width: colWidths[i], height: rowHeight, borderColor, borderWidth });
    page.drawText(header, { x: currentX + 3, y: y - 10, size: 7, font: fontBold });
    currentX += colWidths[i];
  });
  y -= rowHeight;
  
  for (let i = 0; i < numRows; i++) {
    currentX = tableX;
    const animal = datos.animales?.[i] || {};
    const rowData = [i+1, animal.identificacion, animal.categoria, animal.raza, animal.sexo, animal.color, animal.edad, animal.comerciante, animal.observaciones];
    colWidths.forEach((width, j) => {
      page.drawRectangle({ x: currentX, y: y - rowHeight, width, height: rowHeight, borderColor, borderWidth });
      page.drawText(`${rowData[j] || ''}`, { x: currentX + 3, y: y - 10, size: 8 });
      currentX += width;
    });
    y -= rowHeight;
  }
  
  // --- Fila TOTAL DE ANIMALES ---
  const totalAnimales = datos.animales?.length || 0;

  // Celda combinada Ord. + Identificación para la etiqueta
  const totalLabelW = colWidths[0] + colWidths[1];
  page.drawRectangle({ x: tableX, y: y - rowHeight, width: totalLabelW, height: rowHeight, borderColor, borderWidth });
  page.drawText('Total de animales:', { x: tableX + 5, y: y - 10, size: 8, font: fontBold });

  // Celda de Categoría para el número total
  const catX = tableX + totalLabelW; // inicio columna Categoría
  page.drawRectangle({ x: catX, y: y - rowHeight, width: colWidths[2], height: rowHeight, borderColor, borderWidth });
  page.drawText(`${totalAnimales}`, { x: catX + 5, y: y - 10, size: 8 });

  // Marco del resto de la fila (Raza hasta Observaciones)
  const restX = catX + colWidths[2];
  const restW = tableWidth - (restX - tableX);
  page.drawRectangle({ x: restX, y: y - rowHeight, width: restW, height: rowHeight, borderColor, borderWidth });
  
  y -= (rowHeight + 13);

  // --- TABLA AVES ---
  page.drawText('Para el uso exclusivo de aves', { x: tableX, y, size: 9, font: fontBold });
  y -= 15;
  const headersAves = ['Ord.', 'No. galpón', 'Categoría', 'Edad', 'Total de aves', 'Observaciones'];
  const colWidthsAves = [30, 70, 100, 50, 70, 180];
  const numRowsAves = 3;

  currentX = tableX;
  headersAves.forEach((header, i) => {
    if(header === 'Categoría') {
      // Marco rectangular de 2 filas
      page.drawRectangle({ x: currentX, y: y - (rowHeight * 2), width: colWidthsAves[i], height: rowHeight * 2, borderColor, borderWidth });

      // Título "Categoría" centrado en la parte superior
      page.drawText(header, { x: currentX + 25, y: y - 12, size: 7, font: fontBold });

      // Línea horizontal completa para separar Engorde / Postura
      page.drawLine({ start: { x: currentX, y: y - rowHeight }, end: { x: currentX + colWidthsAves[i], y: y - rowHeight }, thickness: borderWidth });

      // Línea vertical para dividir Engorde y Postura
      const catHalfW = colWidthsAves[i] / 2;
      page.drawLine({ start: { x: currentX + catHalfW, y: y - rowHeight }, end: { x: currentX + catHalfW, y: y - (rowHeight * 2) }, thickness: borderWidth });

      // Subtítulos
      page.drawText('Engorde', { x: currentX + 5, y: y - rowHeight - 10, size: 7, font: fontBold });
      page.drawText('Postura', { x: currentX + catHalfW + 5, y: y - rowHeight - 10, size: 7, font: fontBold });
    } else {
      page.drawRectangle({ x: currentX, y: y - (rowHeight * 2), width: colWidthsAves[i], height: rowHeight * 2, borderColor, borderWidth });
      // Centramos el texto verticalmente en la celda de 2 filas
      const txtY = y - rowHeight - 8;
      page.drawText(header, { x: currentX + 5, y: txtY, size: 7, font: fontBold });
    }
    currentX += colWidthsAves[i];
  });
  y -= (rowHeight * 2);

  for (let i = 0; i < numRowsAves; i++) {
    currentX = tableX;
    const ave = datos.aves?.[i] || {};
    const rowData = [i+1, ave.galpon, '', ave.edad, ave.total, ave.observaciones];
    colWidthsAves.forEach((width, j) => {
      page.drawRectangle({ x: currentX, y: y - rowHeight, width, height: rowHeight, borderColor, borderWidth });
       if(j === 2) { // Categoria
         page.drawRectangle({ x: currentX, y: y - rowHeight, width: width/2, height: rowHeight, borderColor, borderWidth });
         page.drawText(ave.categoria === 'Engorde' ? 'X' : '', { x: currentX + 22, y: y - 10, size: 8 });
         page.drawText(ave.categoria === 'Postura' ? 'X' : '', { x: currentX + (width/2) + 22, y: y - 10, size: 8 });
       } else {
         page.drawText(`${rowData[j] || ''}`, { x: currentX + 3, y: y - 10, size: 8 });
       }
      currentX += width;
    });
    y -= rowHeight;
  }
  // --- Fila TOTAL DE ANIMALES ---
  const totalAves = datos.aves?.reduce((acc, a) => acc + (a.total || 0), 0) || 0;

  // Celda combinada para el texto (Ord. + No. galpón)
  const totalCellW = colWidthsAves[0] + colWidthsAves[1];
  page.drawRectangle({ x: tableX, y: y - rowHeight, width: totalCellW, height: rowHeight, borderColor, borderWidth });
  page.drawText('Total de animales:', { x: tableX + 5, y: y - 10, size: 8, font: fontBold });

  // Celda bajo "Engorde" para el valor total
  const engordeX = tableX + totalCellW; // inicio de columna Categoría
  const engordeW = colWidthsAves[2] / 2;
  page.drawRectangle({ x: engordeX, y: y - rowHeight, width: engordeW, height: rowHeight, borderColor, borderWidth });
  page.drawText(`${totalAves}`, { x: engordeX + 5, y: y - 10, size: 8 });

  // Marco del resto de la fila (desde Postura hasta el final), sin líneas internas
  const restoX = engordeX + engordeW;
  const restoW = tableWidth - (restoX - tableX);
  page.drawRectangle({ x: restoX, y: y - rowHeight, width: restoW, height: rowHeight, borderColor, borderWidth });

  y -= (rowHeight + 10);

  // --- ORIGEN Y DESTINO ---
  const col1X = tableX;
  const col2X = tableX + 280;
  const col1W = 270;
  const col2W = 220;
  const fieldH = 18;
  
  let yOrigen = y;
  
  // Columna 1
  page.drawRectangle({ x: col1X, y: y-fieldH, width: col1W, height: fieldH, borderColor, borderWidth });
  page.drawText('Desde:', {x: col1X + 5, y: y-12, size: 8, font: fontBold});
  y-=fieldH;
  page.drawRectangle({ x: col1X, y: y-fieldH, width: col1W, height: fieldH, borderColor, borderWidth });
  page.drawText(`Predio / granja: ${datos.origen?.predio || ''}`, {x: col1X + 5, y: y-12, size: 8});
  y-=fieldH;
  page.drawRectangle({ x: col1X, y: y-fieldH, width: col1W, height: fieldH, borderColor, borderWidth });
  page.drawText(`Parroquia: ${datos.origen?.parroquia || ''}`, {x: col1X + 5, y: y-12, size: 8});
  y-=fieldH;
  page.drawRectangle({ x: col1X, y: y-fieldH, width: col1W, height: fieldH, borderColor, borderWidth });
  page.drawText(`Localidad / sitio / km: ${datos.origen?.localidad || ''}`, {x: col1X + 5, y: y-12, size: 8});
  y-= (fieldH + 5);

  //page.drawRectangle({ x: col1X, y: y-fieldH, width: col1W, height: fieldH, borderColor, borderWidth });
  page.drawText('Destino:', {x: col1X + 5, y: y-12, size: 8, font: fontBold});
  // ----- NUEVO BLOQUE DESTINO -----
  y -= fieldH;

  const gap = 10; // espacio entre los dos recuadros principales
  const destLeftW  = 220;                     // ancho recuadro izquierdo (ligeramente más pequeño)
  const destRightW = tableWidth - destLeftW - gap; // ancho recuadro derecho actualizado
  const destLeftX  = col1X;                   // X inicial recuadro izquierdo
  const destRightX = destLeftX + destLeftW + gap; // X inicial recuadro derecho
  const destBoxH   = fieldH * 2;              // alto total (2 filas)

  // Recuadro izquierdo: "Centro de faenamiento"
  page.drawRectangle({ x: destLeftX, y: y - destBoxH, width: destLeftW, height: destBoxH, borderColor, borderWidth });
  // Línea horizontal que separa filas
  page.drawLine({ start: { x: destLeftX, y: y - fieldH }, end: { x: destLeftX + destLeftW, y: y - fieldH }, thickness: borderWidth });
  // Celda pequeña al final de la primera fila (para marcar)
  const leftSmallCellW = 35;
  page.drawLine({ start: { x: destLeftX + destLeftW - leftSmallCellW, y }, end: { x: destLeftX + destLeftW - leftSmallCellW, y: y - fieldH }, thickness: borderWidth });

  page.drawText('Centro de faenamiento:', { x: destLeftX + 5, y: y - 12, size: 8 });
  page.drawText(`Ubicación: ${datos.destino?.ubicacion || ''}`, { x: destLeftX + 5, y: y - fieldH - 12, size: 8 });

  // Recuadro derecho: "Predio"
  page.drawRectangle({ x: destRightX, y: y - destBoxH, width: destRightW, height: destBoxH, borderColor, borderWidth });
  // Línea horizontal divisoria
  page.drawLine({ start: { x: destRightX, y: y - fieldH }, end: { x: destRightX + destRightW, y: y - fieldH }, thickness: borderWidth });

  // División vertical de la fila superior (celda "Predio")
  const predioCellW = 50;
  page.drawLine({ start: { x: destRightX + predioCellW, y }, end: { x: destRightX + predioCellW, y: y - fieldH }, thickness: borderWidth });
  // División vertical de la fila inferior (celda "Parroquia")
  const parroquiaCellW = 80;
  page.drawLine({ start: { x: destRightX + destRightW - parroquiaCellW, y: y - fieldH }, end: { x: destRightX + destRightW - parroquiaCellW, y: y - destBoxH }, thickness: borderWidth });

  page.drawText('Predio:', { x: destRightX + 5, y: y - 12, size: 8 });
  page.drawText(`Nombre del predio: ${datos.destino?.nombrePredio || ''}`, { x: destRightX + predioCellW + 5, y: y - 12, size: 8 });

  page.drawText(`Dirección o referencia: ${datos.destino?.referencia || ''}`, { x: destRightX + 5, y: y - fieldH - 12, size: 8 });
  // Adaptar tamaño de fuente si el texto de parroquia no cabe
  const parroquiaText = `Parroquia: ${datos.destino?.parroquia || ''}`;
  let parroquiaFontSize = 8;
  const maxParroquiaWidth = parroquiaCellW - 6; // margen de 5 a la izquierda + 1 px seguridad
  while (font.widthOfTextAtSize(parroquiaText, parroquiaFontSize) > maxParroquiaWidth && parroquiaFontSize > 5) {
    parroquiaFontSize -= 0.5; // reducir medio punto hasta que quepa
  }
  page.drawText(parroquiaText, {
    x: destRightX + destRightW - parroquiaCellW + 5,
    y: y - fieldH - 12,
    size: parroquiaFontSize,
  });

  // ---------- COLUMNA 2 : DATOS ADICIONALES ----------
  y = yOrigen;
  page.drawText('Datos adicionales:', { x: col2X, y: y - 12, size: 8, font: fontBold });
  y -= (fieldH + 14);
  page.drawRectangle({ x: col2X + 50, y, width: 15, height: 15, borderColor, borderWidth });
  page.drawText('Propio', { x: col2X, y: y + 3, size: 8 });
  y -= 20;
  page.drawRectangle({ x: col2X + 50, y, width: 15, height: 15, borderColor, borderWidth });
  page.drawText('Arrendado', { x: col2X, y: y + 3, size: 8 });
  y -= 20;
  page.drawRectangle({ x: col2X + 50, y, width: 15, height: 15, borderColor, borderWidth });
  page.drawText('Prestado', { x: col2X, y: y + 3, size: 8 });

  // Ajustamos la "y" para continuar después del bloque Destino completo (dejamos 8 px de margen)
  y = yOrigen - (fieldH * 7) - 13; // 5 px existentes + 8 px extra de separación
  // --- SECCIÓN II: TRANSPORTE ---
  const headerIIHeight = 18;
  page.drawRectangle({ x: tableX, y: y-headerIIHeight, width: tableWidth, height: headerIIHeight, color: rgb(0.9, 0.9, 0.9), borderColor, borderWidth });
  page.drawText('II VÍA DE TRANSPORTE', { x: tableX + 5, y: y-12, size: 9, font: fontBold });
  y -= headerIIHeight;
  // === NUEVA TABLA DE TRANSPORTE ===
  const rowTransporteH = 22; // altura de fila definitiva
  const leftW = 110;
  const transporteBoxH = rowTransporteH * 3; // Terrestre (2 filas) + Otros (1 fila)
  const xRightStart = tableX + leftW;

  // Marco general
  page.drawRectangle({ x: tableX, y: y - transporteBoxH, width: tableWidth, height: transporteBoxH, borderColor, borderWidth });

  // Líneas horizontales (solo a la derecha de la columna de rótulos)
  page.drawLine({ start: { x: xRightStart, y: y - rowTransporteH }, end: { x: tableX + tableWidth, y: y - rowTransporteH }, thickness: borderWidth });
  page.drawLine({ start: { x: xRightStart, y: y - rowTransporteH * 2 }, end: { x: tableX + tableWidth, y: y - rowTransporteH * 2 }, thickness: borderWidth });

  // Línea vertical que separa la columna izquierda
  page.drawLine({ start: { x: xRightStart, y }, end: { x: xRightStart, y: y - transporteBoxH }, thickness: borderWidth });

  // Líneas verticales internas (fila superior y fila intermedia)
  const wTipo = 200; // ancho celda "Tipo de transporte"
  page.drawLine({ start: { x: xRightStart + wTipo, y }, end: { x: xRightStart + wTipo, y: y - rowTransporteH }, thickness: borderWidth });

  const wPlaca = 150;    // ancho celda "Placa"
  const wCedula = 130;   // ancho celda "Cédula"
  const phoneCellW = tableWidth - wPlaca - wCedula - 5; // ancho restante para teléfono (aprox 110 px)
  page.drawLine({ start: { x: xRightStart + wPlaca, y: y - rowTransporteH }, end: { x: xRightStart + wPlaca, y: y - rowTransporteH * 2 }, thickness: borderWidth });
  page.drawLine({ start: { x: xRightStart + wPlaca + wCedula, y: y - rowTransporteH }, end: { x: xRightStart + wPlaca + wCedula, y: y - rowTransporteH * 2 }, thickness: borderWidth });

  // ----- CONTENIDO TERRESTRE -----
  // ---- Terrestre ----
  page.drawText('Terrestre', { x: tableX + 15, y: y - 12, size: 10, font: fontBold });
  page.drawRectangle({ x: tableX + leftW - 25, y: y - (rowTransporteH/2) - 6, width: 15, height: 15, borderColor, borderWidth });

  const labelTipo = 'Tipo de transporte:';
  const tipoLabelW = fontBold.widthOfTextAtSize(labelTipo, 8);
  page.drawText(labelTipo, { x: xRightStart + 5, y: y - 10, size: 8, font: fontBold });
  page.drawText(`${datos.transporte?.tipo || ''}`, { x: xRightStart + 5 + tipoLabelW + 5, y: y - 10, size: 8 });

  const labelTransp = 'Nombre del transportista:';
  const transpLabelW = fontBold.widthOfTextAtSize(labelTransp, 8);
  page.drawText(labelTransp, { x: xRightStart + wTipo + 5, y: y - 10, size: 8, font: fontBold });
  page.drawText(`${datos.transporte?.nombreTransportista || ''}`, { x: xRightStart + wTipo + 5 + transpLabelW + 5, y: y - 10, size: 8 });

  // ----- Fila intermedia -----
  const labelPlaca = 'No. matrícula / placa:';
  const placaLabelW = fontBold.widthOfTextAtSize(labelPlaca, 8);
  page.drawText(labelPlaca, { x: xRightStart + 5, y: y - rowTransporteH - 12, size: 8, font: fontBold });
  page.drawText(`${datos.transporte?.placa || ''}`, { x: xRightStart + 5 + placaLabelW + 5, y: y - rowTransporteH - 12, size: 8 });

  const labelCedula = 'Cédula de identidad:';
  const cedulaLabelW = fontBold.widthOfTextAtSize(labelCedula, 8);
  page.drawText(labelCedula, { x: xRightStart + wPlaca + 5, y: y - rowTransporteH - 12, size: 8, font: fontBold });
  const cedulaX = xRightStart + wPlaca + 5 + cedulaLabelW + 5;
  let cedFont = 8;
  const cedulaVal = `${datos.transporte?.cedula || ''}`;
  while (font.widthOfTextAtSize(cedulaVal, cedFont) > wCedula - cedulaLabelW - 15 && cedFont > 6) {
      cedFont -= 0.5;
  }
  page.drawText(cedulaVal, { x: cedulaX, y: y - rowTransporteH - 12, size: cedFont });

  page.drawText('Teléfono:', { x: xRightStart + wPlaca + wCedula + 5, y: y - rowTransporteH - 12, size: 8, font: fontBold });
  const phoneVal = `${datos.transporte?.telefono || ''}`;
  let phoneFont = 8;
  while (font.widthOfTextAtSize(phoneVal, phoneFont) > phoneCellW - 60 && phoneFont > 6) {
      phoneFont -= 0.5;
  }
  page.drawText(phoneVal, { x: xRightStart + wPlaca + wCedula + 60, y: y - rowTransporteH - 12, size: phoneFont });

  // ----- CONTENIDO OTROS -----
  // ---- Otros ----
  page.drawText('Otros', { x: tableX + 15, y: y - rowTransporteH * 2 - 12, size: 10, font: fontBold });
  page.drawRectangle({ x: tableX + leftW - 25, y: y - rowTransporteH * 2 - (rowTransporteH/2) - 6, width: 15, height: 15, borderColor, borderWidth });

  page.drawText('Detalle de otro:', { x: xRightStart + 5, y: y - rowTransporteH * 2 - 12, size: 8, font: fontBold });
  page.drawText(`${datos.transporte?.detalleOtro || ''}`, { x: xRightStart + 105, y: y - rowTransporteH * 2 - 12, size: 8 });

  y -= (transporteBoxH + 10);
  // --- SECCIÓN III: VALIDEZ ---
  const headerIIIHeight = 18;
  page.drawRectangle({ x: tableX, y: y-headerIIIHeight, width: tableWidth, height: headerIIIHeight, color: rgb(0.9, 0.9, 0.9), borderColor, borderWidth });
  page.drawText('III VALIDEZ Y FIRMAS DE RESPONSABILIDAD', { x: tableX + 5, y: y-12, size: 9, font: fontBold });
  y -= headerIIIHeight;
  
  const validezBoxH = 80;
  page.drawRectangle({ x: tableX, y: y-validezBoxH, width: tableWidth, height: validezBoxH, borderColor, borderWidth });
  page.drawText(`ESTA GUÍA ES VÁLIDA POR EL TIEMPO DE ___________________ A PARTIR DE LAS ____ : ____ HASTA ____ : ____`, {x: tableX + 5, y: y-15, size:8});
  page.drawText(`FECHA DE EMISIÓN: ___________________`, {x: tableX + 5, y: y-30, size:8});
  
  page.drawLine({start: {x: tableX + 30, y: y-65}, end: {x: tableX + 220, y: y-65}, thickness: 0.5});
  page.drawText('NOMBRE Y FIRMA DEL MÉDICO(A) VETERINARIO(A) / TÉCNICO', {x: tableX + 5, y: y-75, size:7});
  
  page.drawLine({start: {x: tableX + 280, y: y-65}, end: {x: tableX + 480, y: y-65}, thickness: 0.5});
  page.drawText('NOMBRE Y FIRMA DEL INTERESADO', {x: tableX + 300, y: y-75, size:7});
  page.drawText('Original usuario, copia 1 centro de faenamiento, copia 2 área técnica.', {x: tableX + 5, y: y-90, size:7});

  y -= (validezBoxH + 10);

  // --- PIE DE PÁGINA ---
  const footerY = 20;
  page.drawText('Dirección: Av. Baltra, diagonal a la gruta del Divino Niño', { x: tableX, y: footerY + 28, size: 7, font });
  page.drawText('Código postal: EC200350 / Puerto Ayora-Ecuador', { x: tableX, y: footerY + 20, size: 7, font });
  page.drawText('Teléfono: +593-5 252 7414', { x: tableX, y: footerY + 12, size: 7, font });
  page.drawText('www.bioseguridadgalapagos.gob.ec', { x: tableX, y: footerY + 4, size: 7, font });
  
  if (nuevoEcuadorImage) {
    page.drawImage(nuevoEcuadorImage, { x: 450, y: footerY, width: 100, height: 40 });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { generarCertificadoPDF }; 