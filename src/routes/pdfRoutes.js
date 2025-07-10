// routes/pdfRoutes.js
const express = require('express');
const puppeteer = require('puppeteer');
const router = express.Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  // ⚠️ Cambia la URL al dominio real de tu frontend si estás en producción
  const url = `http://localhost:3000/solicitud/${id}`;

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Content-Disposition': `attachment; filename=certificado-${id}.pdf`,
    });

    res.send(pdf);
  } catch (err) {
    console.error('Error al generar PDF:', err);
    res.status(500).json({ message: 'Error al generar el PDF' });
  }
});

module.exports = router;
