import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import type { OfferItem, OfferRow, CompanySettings } from '../types';
import { format } from 'date-fns';

// Helper function for currency formatting
function formatCurrency(value: number, currency: string = '€') {
  return value.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
}

// Register Roboto font for diacritics přímo z Google Fonts API
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf',
      fontWeight: 'normal',
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf',
      fontWeight: 'bold',
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 80,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 40,
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  logo: {
    color: '#bbb',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: 'Roboto',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    fontFamily: 'Roboto',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: 'Roboto',
  },
  clientInfo: {
    marginBottom: 24,
    color: '#666',
    fontFamily: 'Roboto',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: 'auto',
    marginBottom: 16,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ccc',
    fontFamily: 'Roboto',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    paddingVertical: 8,
    fontFamily: 'Roboto',
  },
  tableHeader: {
    backgroundColor: '#fafdff',
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  tableCell: {
    padding: 5,
    fontFamily: 'Roboto',
  },
  tableCellRight: {
    textAlign: 'right',
    fontFamily: 'Roboto',
  },
  sumBox: {
    backgroundColor: '#222',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    padding: 12,
    textAlign: 'right',
    marginTop: 24,
    marginBottom: 24,
    fontFamily: 'Roboto',
  },
  note: {
    fontSize: 11,
    marginTop: 16,
    color: '#222',
    fontFamily: 'Roboto',
  },
  footer: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  sectionRow: {
    flexDirection: 'row',
    backgroundColor: '#fafdff',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    paddingVertical: 10,
    paddingLeft: 8,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2346a0',
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 2,
  },
  subtotalRow: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    paddingVertical: 8,
    fontFamily: 'Roboto',
  },
  description: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'Roboto',
  },
  subtotalBox: {
    flexDirection: 'row',
    backgroundColor: '#2346a0',
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
    minHeight: 36,
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  subtotalLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 3,
    paddingVertical: 12,
    paddingLeft: 18,
    fontFamily: 'Roboto',
  },
  subtotalValue: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    flex: 2,
    textAlign: 'right',
    paddingVertical: 12,
    paddingRight: 24,
    fontFamily: 'Roboto',
  },
});

export function OfferPDFDocument({ offer, settings }: { offer: OfferItem, settings: CompanySettings }) {
  // Helper for subtotal calculation
  function getSectionSubtotal(items: OfferRow[], subtotalIdx: number) {
    let lastSectionIdx = -1;
    for (let j = subtotalIdx - 1; j >= 0; j--) {
      if (items[j].type === 'section') {
        lastSectionIdx = j;
        break;
      }
    }
    let sum = 0;
    for (let j = lastSectionIdx + 1; j < subtotalIdx; j++) {
      const row = items[j];
      if (row.type === 'item') {
        sum += Number(row.qty ?? 0) * Number(row.price ?? 0);
      }
    }
    return sum;
  }

  const subtotal = offer.items?.reduce((sum, i) => i.type === 'item' ? sum + i.qty * i.price : sum, 0) ?? 0;
  const discountAmount = subtotal * (offer.discount ?? 0) / 100;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const vat = offer.vatEnabled ? subtotalAfterDiscount * (offer.vatRate ?? 0) / 100 : 0;
  const total = subtotalAfterDiscount + vat;
  const today = format(new Date(), 'd. M. yyyy');

  // Helper for logo
  function isLogoWithSize(obj: any): obj is { src: string; width: number; height: number } {
    return obj && typeof obj.src === 'string' && typeof obj.width === 'number' && typeof obj.height === 'number';
  }
  const logoObj = typeof settings.logo === 'object' && settings.logo !== null ? settings.logo : { src: settings.logo };
  const isPngOrJpg = logoObj.src && logoObj.src.startsWith('data:image/') && !logoObj.src.startsWith('data:image/svg');
  const isSmallEnough = isPngOrJpg && logoObj.src.length < 120000; // ~90kB base64

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {isPngOrJpg && isSmallEnough ? (
            isLogoWithSize(logoObj) ? (
              <Image
                src={logoObj.src}
                style={{ width: 200, height: Math.round(200 * (logoObj.height / logoObj.width)), objectFit: 'contain' }}
              />
            ) : (
              <Image
                src={logoObj.src}
                style={{ width: 200, objectFit: 'contain' }}
              />
            )
          ) : (
            <View>
              <Text style={{ ...styles.logo, fontFamily: 'Roboto', fontWeight: 'bold' }}>{logoObj.src ? 'LOGO (obrázok sa nezobrazil)' : 'LOGO'}</Text>
              {isPngOrJpg && !isSmallEnough && (
                <Text style={{ fontFamily: 'Roboto', color: 'red', fontSize: 10 }}>Logo je príliš veľké na PDF export (max 100kB, aktuálne {Math.round(logoObj.src.length/1024)}kB)</Text>
              )}
              {logoObj.src && logoObj.src.startsWith('data:image/svg') && (
                <Text style={{ fontFamily: 'Roboto', color: 'red', fontSize: 10 }}>SVG logo nie je podporované v PDF, použite PNG/JPG.</Text>
              )}
            </View>
          )}
          <View>
            <Text style={{ fontFamily: 'Roboto', fontWeight: 'normal' }}>{settings.email}</Text>
            {settings.phone && <Text style={{ fontFamily: 'Roboto', fontWeight: 'normal' }}>{settings.phone}</Text>}
            {settings.web && <Text style={{ fontFamily: 'Roboto', fontWeight: 'normal' }}>{settings.web}</Text>}
          </View>
        </View>

        <Text style={{ ...styles.title, fontFamily: 'Roboto', fontWeight: 'bold' }}>Cenová ponuka na {offer.name}</Text>
        {offer.date && (
          <Text style={{ ...styles.clientInfo, fontFamily: 'Roboto', fontWeight: 'normal' }}>Dátum: {offer.date}</Text>
        )}
        {offer.client && (
          <Text style={{ ...styles.clientInfo, fontFamily: 'Roboto', fontWeight: 'normal' }}>Klient: {offer.client}</Text>
        )}

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={{ ...styles.tableCell, flex: 2, fontFamily: 'Roboto', fontWeight: 'bold' }}>Názov</Text>
            <Text style={{ ...styles.tableCell, flex: 2, fontFamily: 'Roboto', fontWeight: 'bold' }}>Popis</Text>
            <Text style={{ ...styles.tableCell, flex: 1, ...styles.tableCellRight, fontFamily: 'Roboto', fontWeight: 'bold' }}>Počet</Text>
            <Text style={{ ...styles.tableCell, flex: 1, ...styles.tableCellRight, fontFamily: 'Roboto', fontWeight: 'bold' }}>Cena ({settings.currency})</Text>
            <Text style={{ ...styles.tableCell, flex: 1, ...styles.tableCellRight, fontFamily: 'Roboto', fontWeight: 'bold' }}>Medzisúčet</Text>
          </View>
          {/* Položky, sekce, subtotal */}
          {offer.items.map((item, idx) => {
            if (item.type === 'section') {
              return (
                <View key={item.id} style={[styles.sectionRow]}>
                  <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#2346a0', padding: 6, fontFamily: 'Roboto' }}>
                    {item.title}
                  </Text>
                </View>
              );
            }
            if (item.type === 'subtotal') {
              const sum = getSectionSubtotal(offer.items, idx);
              return (
                <View key={item.id} style={styles.subtotalBox}>
                  <Text style={styles.subtotalLabel}>Cena spolu:</Text>
                  <Text style={styles.subtotalValue}>{sum.toFixed(2)} {settings.currency || '€'}</Text>
                </View>
              );
            }
            // Položka
            return (
              <View key={item.id} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 2, flexDirection: 'column' }]}> 
                  <Text style={{ fontWeight: 'bold', fontSize: 13, fontFamily: 'Roboto' }}>{item.title}</Text>
                  {item.desc && (
                    <Text style={{ ...styles.description, fontFamily: 'Roboto', fontWeight: 'normal' }}>{item.desc}</Text>
                  )}
                </View>
                <View style={[styles.tableCell, { flex: 2 }]} />
                <View style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}> 
                  <Text style={{ fontFamily: 'Roboto', fontWeight: 'normal' }}>{item.unit || 'ks'}</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}> 
                  <Text style={{ fontFamily: 'Roboto', fontWeight: 'normal' }}>{item.qty}</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}> 
                  <Text style={{ fontFamily: 'Roboto', fontWeight: 'normal' }}>{item.price !== undefined ? item.price.toFixed(2) + ' ' + (settings.currency || '€') : ''}</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}> 
                  <Text style={{ fontFamily: 'Roboto', fontWeight: 'normal' }}>{((item.qty ?? 0) * (item.price ?? 0)).toFixed(2)} {settings.currency || '€'}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Summary section */}
        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, fontSize: 12 }}>
            <View style={{ textAlign: 'right' }}>
              <Text style={{ color: '#666', marginBottom: 4 }}>Medzisúčet:</Text>
              {offer.discount > 0 && <Text style={{ color: '#666', marginBottom: 4 }}>Zľava {offer.discount}%:</Text>}
              {offer.vatEnabled && <Text style={{ color: '#666', marginBottom: 4 }}>DPH {offer.vatRate}%:</Text>}
              <Text style={{ fontWeight: 'bold', color: '#2346a0', fontSize: 16, marginTop: 8 }}>Spolu:</Text>
            </View>
            <View style={{ textAlign: 'right', minWidth: 100 }}>
              <Text style={{ color: '#666', marginBottom: 4 }}>{formatCurrency(subtotal)}</Text>
              {offer.discount > 0 && <Text style={{ color: '#666', marginBottom: 4 }}>-{formatCurrency(discountAmount)}</Text>}
              {offer.vatEnabled && <Text style={{ color: '#666', marginBottom: 4 }}>{formatCurrency(vat)}</Text>}
              <Text style={{ fontWeight: 'bold', color: '#2346a0', fontSize: 16, marginTop: 8 }}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sumBox}>
          <View style={{ flexDirection: 'column', alignItems: 'flex-end', width: '100%' }}>
            {offer.discount > 0 && (
              <Text style={{ textDecoration: 'line-through', color: 'red', fontSize: 16, fontWeight: 'bold', marginBottom: 2 }}>
                {subtotal.toFixed(2)} {settings.currency || '€'}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>{total.toFixed(2)} {settings.currency || '€'}</Text>
              {offer.discount > 0 && (
                <View style={{ backgroundColor: '#c00', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 8, minWidth: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>-{offer.discount}%</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {settings.pdfNote && <Text style={{ ...styles.note, fontFamily: 'Roboto', fontWeight: 'normal' }}>{settings.pdfNote}</Text>}
        {offer.note && <Text style={{ ...styles.note, fontFamily: 'Roboto', fontWeight: 'normal' }}>{offer.note}</Text>}
        {offer.tableNote && <Text style={{ ...styles.note, fontFamily: 'Roboto', fontWeight: 'normal' }}>{offer.tableNote}</Text>}
        <View style={styles.footer}>
          <Text style={{ fontFamily: 'Roboto', fontWeight: 'normal' }}>{settings.name} | IČO: {settings.ico} | {settings.email} | {settings.web}</Text>
          <Text style={{ fontFamily: 'Roboto', fontWeight: 'normal' }}>Vytvorené: {today}</Text>
        </View>
      </Page>
    </Document>
  );
}

// Utility: SVG to PNG (base64) conversion s udržením poměru stran a výstupem rozměrů
export async function svgToPngDataUrl(svgDataUrl: string, maxWidth = 800, maxHeight = 400): Promise<{dataUrl: string, width: number, height: number}> {
  // Dynamicky importuj canvg
  const { Canvg } = await import('canvg');
  return new Promise((resolve, reject) => {
    let width = maxWidth;
    let height = maxHeight;
    try {
      const svgText = atob(svgDataUrl.split(',')[1]);
      const matchW = svgText.match(/width=["'](\d+(?:\.\d+)?)(px)?["']/i);
      const matchH = svgText.match(/height=["'](\d+(?:\.\d+)?)(px)?["']/i);
      const matchVB = svgText.match(/viewBox=["']([\d\.]+)[ ,]+([\d\.]+)[ ,]+([\d\.]+)[ ,]+([\d\.]+)["']/i);
      if (matchW && matchH) {
        width = parseFloat(matchW[1]);
        height = parseFloat(matchH[1]);
      } else if (matchVB) {
        width = parseFloat(matchVB[3]);
        height = parseFloat(matchVB[4]);
      }
      // Zachovaj pomer strán a maximalizuj do maxWidth/maxHeight
      const ratio = width / height;
      if (width > maxWidth) {
        width = maxWidth;
        height = Math.round(width / ratio);
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = Math.round(height * ratio);
      }
      // Vytvor canvas a vykresli SVG cez canvg
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas context error');
      const v = Canvg.fromString(ctx, svgText);
      v.render().then(() => {
        resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
      }).catch(reject);
    } catch (e) {
      reject(e);
    }
  });
} 