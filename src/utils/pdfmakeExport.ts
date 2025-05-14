import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = (pdfFonts as any).vfs;

// Typy podľa tvojej aplikácie
import type { OfferItem, CompanySettings } from '../types';

// Helper: Convert HTML bullet lists (with nested <ul>) to indented text for PDF export
function htmlBulletsToIndentedText(html: string, level = 0): string {
  // Find all <li>...</li>
  return (html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [])
    .map(li => {
      // Find nested <ul>
      const innerUl = li.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
      // Text before nested <ul>
      const text = li.replace(/<ul[\s\S]*$/i, '').replace(/<[^>]+>/g, '').trim();
      // If nested list, process recursively
      const nested = innerUl ? '\n' + htmlBulletsToIndentedText(innerUl[1], level + 1) : '';
      return `${'  '.repeat(level)}• ${text}${nested}`;
    })
    .join('\n');
}

// Helper: Convert HTML bullet lists (with nested <ul>) to indented text lines for PDF export in tables
function htmlBulletsToIndentedTextLines(html: string, level = 0): string[] {
  const liMatches = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
  return liMatches.flatMap(m => {
    const liContent = m[1];
    const ulMatch = liContent.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
    const indent = '    '.repeat(level); // 4 spaces per level
    const text = liContent.replace(/<ul[\s\S]*$/i, '').replace(/<[^>]+>/g, '').trim();
    const line = `${indent}• ${text}`;
    if (ulMatch) {
      return [line, ...htmlBulletsToIndentedTextLines(ulMatch[1], level + 1)];
    } else {
      return [line];
    }
  });
}

// Recursively convert HTML <ul><li>...</li></ul> to pdfmake ul structure
function htmlBulletsToPdfmakeList(html: string): any {
  if (!html || !html.includes('<ul>')) {
    return { text: html.replace(/<[^>]+>/g, '').trim(), fontSize: 10, color: '#666' };
  }

  // Funkcia na čistenie textu od HTML tagov
  const cleanText = (text: string): string => text.replace(/<[^>]+>/g, '').trim();
  
  // Funkcia na extrakciu <li> elementov z <ul>
  const extractListItems = (ulHtml: string): string[] => {
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const items: string[] = [];
    let match;
    
    while ((match = liRegex.exec(ulHtml)) !== null) {
      items.push(match[1]);
    }
    
    return items;
  };
  
  // Funkcia na vytvorenie PDFMake zoznamu
  const createPdfList = (items: string[], level = 0): any[] => {
    return items.map(item => {
      // Skontroluj, či položka obsahuje vnorený <ul>
      const hasNestedUl = item.includes('<ul>');
      
      if (hasNestedUl) {
        // Rozdeľ na text a vnorený <ul>
        const parts = item.split(/<ul[^>]*>/i);
        const textContent = cleanText(parts[0]);
        
        // Extrahuj vnorený <ul> a jeho položky
        const nestedUlMatch = /<ul[^>]*>([\s\S]*?)<\/ul>/i.exec(item);
        if (nestedUlMatch) {
          const nestedItems = extractListItems(nestedUlMatch[0]);
          
          // Vytvor položku s textom a vnoreným zoznamom
          return {
            text: textContent,
            margin: [level * 10, 0, 0, 0],
            fontSize: 10,
            color: '#666',
            ul: createPdfList(nestedItems, level + 1)
          };
        }
      }
      
      // Jednoduchá položka bez vnorenia
      return {
        text: cleanText(item),
        margin: [level * 10, 0, 0, 0],
        fontSize: 10,
        color: level === 0 ? '#666' : '#888'
      };
    });
  };
  
  // Nájdi hlavný <ul> element a spracuj jeho položky
  const mainUlMatch = /<ul[^>]*>([\s\S]*?)<\/ul>/i.exec(html);
  if (mainUlMatch) {
    const mainItems = extractListItems(mainUlMatch[0]);
    
    // Vytvor PDFMake štruktúru pre zoznam s vlastnými markermi
    return {
      ul: createPdfList(mainItems),
      style: {
        fontSize: 10,
        color: '#666'
      },
      markerColor: '#666'
    };
  }
  
  // Fallback ak sa nenašiel <ul>
  return { text: cleanText(html), fontSize: 10, color: '#666' };
}

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
    ...offer.items.map(item => {
      let desc: any = item.desc || '';
      if (desc.includes('<ul>')) {
        desc = htmlBulletsToPdfmakeList(desc);
      }
      return [
        { text: item.title, bold: item.type === 'section', fillColor: item.type === 'section' ? '#fafdff' : undefined },
        typeof desc === 'string' ? { text: desc, fontSize: 10, color: '#666' } : desc,
        item.type === 'item' ? (item.qty ?? '') : '',
        item.type === 'item' ? (item.price !== undefined ? item.price.toFixed(2) : '') : '',
        item.type === 'item' ? (((item.qty ?? 0) * (item.price ?? 0)).toFixed(2)) : ''
      ];
    })
  ];

  // Calculate totals
  const subtotal = offer.items.reduce((sum, i) => i.type === 'item' ? sum + (i.qty ?? 0) * (i.price ?? 0) : sum, 0);
  const discountAmount = subtotal * (offer.discount ?? 0) / 100;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const vat = offer.vatEnabled ? subtotalAfterDiscount * (offer.vatRate ?? 0) / 100 : 0;
  const total = subtotalAfterDiscount + vat;

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
          fillColor: (rowIndex: number) => rowIndex === 0 ? '#fafdff' : null
        },
        margin: [0, 0, 0, 10]
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