import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = (pdfFonts as any).vfs;

// Typy podľa tvojej aplikácie
import type { OfferItem, CompanySettings } from '../types';

export async function exportOfferPdfWithPdfmake(offer: OfferItem, settings: CompanySettings) {
  // Priprav logo (SVG alebo PNG/JPG)
  let logoImage = undefined;
  if (settings.logo?.startsWith('data:image/svg')) {
    let svgText = '';
    if (settings.logo.startsWith('data:image/svg+xml;base64,')) {
      svgText = atob(settings.logo.split(',')[1]);
    } else if (
      settings.logo.startsWith('data:image/svg+xml,') ||
      settings.logo.startsWith('data:image/svg+xml;utf8,')
    ) {
      svgText = decodeURIComponent(settings.logo.split(',')[1]);
    } else {
      svgText = settings.logo;
    }
    // Odstráň BOM, whitespace a všetko pred <svg
    const svgStart = svgText.indexOf('<svg');
    if (svgStart !== -1) {
      svgText = svgText.slice(svgStart);
    }
    // Automatická úprava SVG: nahradím class='cls-1' za fill-rule='evenodd' a odstránim <style> blok
    svgText = svgText.replace(/class=['"]cls-1['"]/g, "fill-rule='evenodd'");
    svgText = svgText.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
    // Odstránim <defs>, <title>, id, data-name
    svgText = svgText.replace(/<defs>[\s\S]*?<\/defs>/g, '');
    svgText = svgText.replace(/<title>[\s\S]*?<\/title>/g, '');
    svgText = svgText.replace(/ id=['"][^'"]*['"]/g, '');
    svgText = svgText.replace(/ data-name=['"][^'"]*['"]/g, '');
    if (svgText.trim().startsWith('<svg')) {
      console.log('Dekódované SVG pre PDF:', svgText.slice(0, 500));
      logoImage = { svg: svgText, width: 200 };
    } else {
      console.warn('SVG logo nie je validné SVG, nebude vložené do PDF. Začiatok SVG:', svgText.slice(0, 200));
      if (!svgText.includes('<svg')) {
        console.warn('SVG string neobsahuje <svg vôbec! Celý string:', svgText);
      }
    }
  } else if (settings.logo?.startsWith('data:image/')) {
    // PNG/JPG
    logoImage = { image: settings.logo, width: 200 };
  }

  // Priprav tabuľku položiek
  const tableBody = [
    [
      { text: 'Názov', bold: true },
      { text: 'Popis', bold: true },
      { text: 'Počet', bold: true },
      { text: `Cena (${settings.currency})`, bold: true },
      { text: 'Medzisúčet', bold: true }
    ],
    ...offer.items.map(item => [
      { text: item.title, bold: item.type === 'section', fillColor: item.type === 'section' ? '#f4f4f4' : undefined },
      item.desc || '',
      item.type === 'item' ? (item.qty ?? '') : '',
      item.type === 'item' ? (item.price !== undefined ? item.price.toFixed(2) : '') : '',
      item.type === 'item' ? (((item.qty ?? 0) * (item.price ?? 0)).toFixed(2)) : ''
    ])
  ];

  // Priprav dokument
  console.log('logoImage pre PDF:', logoImage);
  const docDefinition: any = {
    content: [
      logoImage ? logoImage : { text: '' },
      { text: `\n${settings.name}`, bold: true, fontSize: 16 },
      { text: `${settings.email} | ${settings.phone} | ${settings.web}`, fontSize: 10, color: '#666', margin: [0, 0, 0, 10] },
      { text: `Cenová ponuka na ${offer.name}`, style: 'header', margin: [0, 10, 0, 10] },
      offer.date ? { text: `Dátum: ${offer.date}`, fontSize: 10, margin: [0, 0, 0, 10] } : {},
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 40, 60, 60],
          body: tableBody
        },
        layout: {
          fillColor: (rowIndex: number) => rowIndex === 0 ? '#eee' : null
        },
        margin: [0, 0, 0, 10]
      },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            stack: [
              { text: `Medzisúčet: ${offer.items.reduce((sum, i) => i.type === 'item' ? sum + (i.qty ?? 0) * (i.price ?? 0) : sum, 0).toFixed(2)} ${settings.currency}` },
              offer.vatEnabled ? { text: `DPH (${offer.vatRate}%): ${((offer.items.reduce((sum, i) => i.type === 'item' ? sum + (i.qty ?? 0) * (i.price ?? 0) : sum, 0)) * (offer.vatRate ?? 0) / 100).toFixed(2)} ${settings.currency}` } : {},
              { text: `Spolu: ${(offer.items.reduce((sum, i) => i.type === 'item' ? sum + (i.qty ?? 0) * (i.price ?? 0) : sum, 0) + (offer.vatEnabled ? ((offer.items.reduce((sum, i) => i.type === 'item' ? sum + (i.qty ?? 0) * (i.price ?? 0) : sum, 0)) * (offer.vatRate ?? 0) / 100) : 0)).toFixed(2)} ${settings.currency}`, bold: true, fontSize: 14, color: '#2346a0', margin: [0, 5, 0, 0] }
            ]
          }
        ],
        margin: [0, 10, 0, 0]
      },
      settings.pdfNote ? { text: settings.pdfNote, fontSize: 10, margin: [0, 10, 0, 0] } : {},
      offer.note ? { text: offer.note, fontSize: 10, margin: [0, 2, 0, 0] } : {},
      offer.tableNote ? { text: offer.tableNote, fontSize: 10, margin: [0, 2, 0, 0] } : {},
    ],
    styles: {
      header: { fontSize: 20, bold: true, margin: [0, 10, 0, 10] }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };

  pdfMake.createPdf(docDefinition).open();
} 