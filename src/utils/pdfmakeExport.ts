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
  if (!html) return { text: '', fontSize: 10, color: '#666' };
  
  // Odstráň <p> tagy a ďalšie nepotrebné tagy, ale zachovaj <ul> a <li>
  html = html
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '')
    .replace(/ class="[^"]*"/gi, '')
    .replace(/ style="[^"]*"/gi, '')
    .replace(/ data-[^=]+="[^"]*"/gi, '')
    .replace(/>\s+</g, '><')
    .trim();
  
  console.log("HTML pre PDF:", html);
  
  // Ak je to len text bez bullet listov, vráť čistý text
  if (!html.includes('<ul') && !html.includes('<li')) {
    return { text: html.replace(/<[^>]+>/g, '').trim(), fontSize: 10, color: '#666' };
  }

  // Funkcia na extrakciu obsahu <li> elementu vrátane vnoreného <ul>
  function extractLiContent(liHtml: string): { text: string, nestedUl: string | null } {
    // Nájdi vnorený <ul> ak existuje
    const nestedUlMatch = /<ul[^>]*>([\s\S]*?)<\/ul>/i.exec(liHtml);
    const nestedUl = nestedUlMatch ? nestedUlMatch[0] : null;
    
    // Získaj text pred vnoreným <ul>
    let text = liHtml;
    if (nestedUl) {
      text = liHtml.substring(0, liHtml.indexOf(nestedUl));
    }
    
    // Odstráň HTML tagy z textu
    text = text.replace(/<[^>]+>/g, '').trim();
    
    return { text, nestedUl };
  }
  
  // Funkcia na spracovanie <ul> elementu a jeho položiek
  function processUl(ulHtml: string, level: number = 0): any {
    // Extrahuj všetky <li> elementy
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const items = [];
    let match;
    
    while ((match = liRegex.exec(ulHtml)) !== null) {
      const liContent = match[1];
      const { text, nestedUl } = extractLiContent(liContent);
      
      const item: any = {
        text: text || ' ',
        margin: [level * 5, level > 0 ? 2 : 0, 0, level > 0 ? 2 : 0],
        fontSize: 10,
        color: level === 0 ? '#666' : '#888'
      };
      
      // Ak existuje vnorený <ul>, spracuj ho rekurzívne
      if (nestedUl) {
        item.ul = processUl(nestedUl, level + 1).ul;
      }
      
      items.push(item);
    }
    
    return {
      ul: items,
      style: {
        fontSize: 10,
        color: '#666'
      }
    };
  }
  
  // Nájdi hlavný <ul> element a spracuj ho
  const mainUlMatch = /<ul[^>]*>([\s\S]*?)<\/ul>/i.exec(html);
  if (mainUlMatch) {
    const mainUl = mainUlMatch[0];
    return processUl(mainUl);
  }
  
  // Fallback ak sa nenašiel <ul>
  return { text: html.replace(/<[^>]+>/g, '').trim(), fontSize: 10, color: '#666' };
}

export async function exportOfferPdfWithPdfmake(offer: OfferItem, settings: CompanySettings) {
  console.log("exportOfferPdfWithPdfmake - offer:", offer);
  
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
      if (desc.includes('<ul')) {
        console.log("Item with bullet list:", item.title, desc);
        desc = htmlBulletsToPdfmakeList(desc);
        console.log("Processed bullet list for PDF:", desc);
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
      
      // Fakturačné údaje - dva stĺpce
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Fakturačné údaje klienta:', fontSize: 11, bold: true, color: '#444', margin: [0, 0, 0, 5] },
              { text: offer.clientDetails?.name || '', fontSize: 10 },
              { text: offer.clientDetails?.company || '', fontSize: 10 },
              { text: offer.clientDetails?.address || '', fontSize: 10 },
              { text: `${offer.clientDetails?.zip || ''} ${offer.clientDetails?.city || ''}`, fontSize: 10 },
              { text: offer.clientDetails?.country || '', fontSize: 10 },
              { text: `IČO: ${offer.clientDetails?.ico || ''}`, fontSize: 10 },
              offer.clientDetails?.dic ? { text: `DIČ: ${offer.clientDetails.dic}`, fontSize: 10 } : {},
              offer.clientDetails?.icDph ? { text: `IČ DPH: ${offer.clientDetails.icDph}`, fontSize: 10 } : {}
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'Fakturačné údaje dodávateľa:', fontSize: 11, bold: true, color: '#444', margin: [0, 0, 0, 5] },
              { text: settings.name, fontSize: 10 },
              { text: settings.address || '', fontSize: 10 },
              { text: `${settings.zip || ''} ${settings.city || ''}`, fontSize: 10 },
              { text: settings.country || '', fontSize: 10 },
              { text: `IČO: ${settings.ico || ''}`, fontSize: 10 },
              settings.dic ? { text: `DIČ: ${settings.dic}`, fontSize: 10 } : {},
              settings.icDph ? { text: `IČ DPH: ${settings.icDph}`, fontSize: 10 } : {}
            ]
          }
        ],
        margin: [0, 0, 0, 15]
      },
      
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
      // Footer v šedom pruhu
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 30, r: 4, color: '#f3f3f7' }],
        margin: [0, 20, 0, 0]
      },
      {
        text: [
          { text: settings.name, color: '#666', fontSize: 9 },
          settings.ico ? { text: ` | IČO: ${settings.ico}`, color: '#666', fontSize: 9 } : '',
          settings.dic ? { text: ` | DIČ: ${settings.dic}`, color: '#666', fontSize: 9 } : '',
          settings.icDph ? { text: ` | IČ DPH: ${settings.icDph}`, color: '#666', fontSize: 9 } : ''
        ],
        alignment: 'center',
        margin: [-5, -20, 0, 0]
      }
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