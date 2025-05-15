import React, { useState, useEffect, useRef } from 'react'
import './App.css'
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2pdf from 'html2pdf.js';
import LogoUpload from './components/LogoUpload';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Notification } from './components/Notification';
import type { OfferItem, OfferRow, CompanySettings, ItemRow, SectionRow, SubtotalRow, ClientDetails } from './types';
import { FaTrash, FaRegClone, FaChevronRight, FaRegFileAlt } from 'react-icons/fa';
import { FaUser } from 'react-icons/fa';
import { exportOfferPdfWithPdfmake } from './utils/pdfmakeExport';
import { createRoot } from 'react-dom/client';


// --- Funkcia na extrakciu bodov a generovanie čistého zoznamu ---
function extractBullets(html: string): string {
  if (!html) return '';
  
  console.log('extractBullets input:', html);
  
  // Špeciálne spracovanie pre ReactQuill HTML
  if (html.includes('<ul') || html.includes('<li')) {
    // Odstráň <p> tagy okolo <ul>
    let cleanedHtml = html
      .replace(/<p>\s*<ul/g, '<ul')
      .replace(/<\/ul>\s*<\/p>/g, '</ul>')
      // Zachovaj vnorené <ul> a <li>
      .replace(/<li[^>]*><p[^>]*>([\s\S]*?)<\/p><ul/g, '<li>$1<ul')
      // Odstráň atribúty z <ul> a <li> tagov ale zachovaj štruktúru
      .replace(/<(ul|li)[^>]*>/gi, (match) => {
        if (match.startsWith('<ul')) return '<ul>';
        if (match.startsWith('<li')) return '<li>';
        return match;
      })
      // Odstráň prázdne <p> tagy
      .replace(/<p>\s*<\/p>/gi, '')
      // Odstráň <br> tagy
      .replace(/<br\s*\/?>/gi, '')
      // Vyčisti whitespace
      .replace(/>\s+</g, '><')
      .trim();
    
    // Ak je to len text bez bullet listov, vráť čistý text
    if (!cleanedHtml.includes('<ul') && !cleanedHtml.includes('<li')) {
      return cleanedHtml.replace(/<[^>]+>/g, '').trim();
    }
    
    console.log('Cleaned HTML output:', cleanedHtml);
    return cleanedHtml;
  }
  
  // Pre obyčajný text bez HTML
  const plainText = html.replace(/<[^>]+>/g, '').trim();
  
  // Ak text obsahuje odrážky, vytvor z nich HTML bullet list
  if (plainText.includes('• ')) {
    const items = plainText.split('• ').filter(item => item.trim().length > 0);
    if (items.length > 0) {
      const result = '<ul>' + items.map(item => `<li>${item.trim()}</li>`).join('') + '</ul>';
      console.log('Generated bullet list from text with bullets:', result);
      return result;
    }
  }
  
  // Ak text obsahuje čísla s bodkou na začiatku riadkov, vytvor z nich HTML ordered list
  if (/^\d+\.\s/.test(plainText)) {
    const items = plainText.split(/\d+\.\s/).filter(item => item.trim().length > 0);
    if (items.length > 0) {
      const result = '<ol>' + items.map(item => `<li>${item.trim()}</li>`).join('') + '</ol>';
      console.log('Generated ordered list:', result);
      return result;
    }
  }
  
  // Ak text obsahuje oddelené riadky, vytvor z nich HTML bullet list
  if (plainText.includes('\n')) {
    const items = plainText.split('\n').filter(item => item.trim().length > 0);
    if (items.length > 1) {
      const result = '<ul>' + items.map(item => `<li>${item.trim()}</li>`).join('') + '</ul>';
      console.log('Generated bullet list from multiline text:', result);
      return result;
    }
  }
  
  // Ak text obsahuje stredníky, vytvor z nich HTML bullet list
  if (plainText.includes(';')) {
    const items = plainText.split(';').filter(item => item.trim().length > 0);
    if (items.length > 1) {
      const result = '<ul>' + items.map(item => `<li>${item.trim()}</li>`).join('') + '</ul>';
      console.log('Generated bullet list from semicolon-separated text:', result);
      return result;
    }
  }
  
  // Ak nie je možné vytvoriť bullet list, vráť pôvodný text
  return plainText;
}

// Helper: Convert HTML bullet list to plain text (one bullet per line)
function bulletsHtmlToText(html: string): string {
  const matches = Array.from((html || '').matchAll(/<li[^>]*>(.*?)<\/li>/gi));
  if (matches.length) {
    return matches.map(m => m[1].replace(/<[^>]+>/g, '').trim()).join('\n');
  }
  // fallback: strip all tags
  return (html || '').replace(/<[^>]+>/g, '').trim();
}

function formatCurrency(value: number, currency: string = '€'): string {
  return value
    .toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
}

// Komponent pre zoznam ponúk
function OfferList({ offers, onNew, onSelect, onDelete, onEdit, onClone }: {
  offers: OfferItem[];
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onClone: (id: string) => void;
}) {
  return (
    <div className="offer-card offer-live-preview" style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 8px 48px #0002', padding: 40, fontFamily: 'Noto Sans, Arial, Helvetica, sans-serif', color: '#222' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#2346a0', margin: 0, letterSpacing: -0.5 }}>Cenové ponuky</h1>
        <button onClick={onNew} style={{ padding: '12px 28px', background: '#2346a0', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaRegFileAlt style={{ fontSize: 20 }} />
          + Nová ponuka
        </button>
      </div>
      {offers.length === 0 && (
        <div style={{ textAlign: 'center', color: '#888', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Zatiaľ nemáte žiadne ponuky</div>
          <div style={{ fontSize: 14, color: '#aaa', marginTop: 6 }}>Kliknite na <b>+ Nová ponuka</b> pre vytvorenie prvej ponuky.</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {offers.map((offer, idx) => (
          <div
            key={offer.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fafdff',
              borderRadius: idx === 0 ? '10px 10px 0 0' : idx === offers.length-1 ? '0 0 10px 10px' : '0',
              border: '1px solid #dde6f3',
              borderTop: idx === 0 ? '1px solid #dde6f3' : 'none',
              padding: '20px 28px',
              marginBottom: 0,
              fontSize: 16,
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.18s, box-shadow 0.18s, border 0.18s',
            }}
            onClick={() => onEdit(offer.id)}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f3f7fd';
              e.currentTarget.style.boxShadow = '0 4px 24px #2346a022';
              e.currentTarget.style.border = '1px solid #2346a0';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#fafdff';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.border = '1px solid #dde6f3';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <FaRegFileAlt style={{ fontSize: 22, color: '#2346a0', marginRight: 8 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#2346a0', fontSize: 18, marginBottom: 2 }}>{offer.name}</div>
                <div style={{ color: '#888', fontSize: 15 }}>{offer.total.toFixed(2)} €</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                className="offer-row-icon"
                title="Klonovať ponuku"
                style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', marginRight: 2, display: 'flex', alignItems: 'center' }}
                onClick={e => { e.stopPropagation(); onClone(offer.id); }}
              >
                <FaRegClone style={{ fontSize: 17, color: '#bbb', transition: 'color 0.18s' }} />
              </button>
              <button
                className="offer-row-icon"
                title="Vymazať ponuku"
                style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', marginRight: 2, display: 'flex', alignItems: 'center' }}
                onClick={e => { e.stopPropagation(); onDelete(offer.id); }}
              >
                <FaTrash style={{ fontSize: 17, color: '#ccc', transition: 'color 0.18s' }} />
              </button>
              <FaChevronRight style={{ fontSize: 22, color: '#bbb', marginLeft: 10, userSelect: 'none', transition: 'color 0.18s', cursor: 'pointer' }} />
            </div>
            {idx < offers.length-1 && <div style={{ position: 'absolute', left: 28, right: 28, bottom: -1, height: 1, background: '#dde6f3' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// Komponent pre formulár ponuky (rozšírený)
function OfferForm({ onBack, onSave, onAutosave, initial, onNotify, settings, setSettings }: { onBack: () => void, onSave: (offer: OfferItem) => void, onAutosave: (offer: OfferItem) => void, initial?: OfferItem, onNotify: (msg: string, type: 'success' | 'error' | 'info') => void, settings: CompanySettings, setSettings: React.Dispatch<React.SetStateAction<CompanySettings>> }) {
  const [name, setName] = useState(initial?.name || '');
  const [date, setDate] = useState(initial?.date || '');
  const [client, setClient] = useState(initial?.client || '');
  const [clientDetails, setClientDetails] = useState(initial?.clientDetails || null);
  const [note, setNote] = useState(initial?.note || '');
  const [items, setItems] = useState<OfferRow[]>(initial?.items || []);
  const [vatEnabled, setVatEnabled] = useState(initial?.vatEnabled ?? true);
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? 20);
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [rowType, setRowType] = useState<'item' | 'section' | 'subtotal'>('item');
  const [tableNote, setTableNote] = useState(initial?.tableNote || '');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Polia pre novú položku
  const [rowTitle, setRowTitle] = useState('');
  const [rowDesc, setRowDesc] = useState('');
  const [rowQty, setRowQty] = useState(1);
  const [rowPrice, setRowPrice] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [descEditorOpen, setDescEditorOpen] = useState(false);

  // V OfferForm:
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<OfferRow> | null>(null);
  const [addType, setAddType] = useState<'item' | 'section' | 'subtotal' | null>(null);

  // Načítanie nastavení firmy
  const [showDetails, setShowDetails] = useState(initial?.showDetails ?? true);

  function handleAddRow(e: React.FormEvent) {
    e.preventDefault();
    if (rowType === 'section') {
      setItems(items => [...items, { id: Date.now().toString(), type: 'section', title: rowTitle, desc: '' }]);
    } else if (rowType === 'subtotal') {
      setItems(items => [...items, { id: Date.now().toString(), type: 'subtotal', title: rowTitle || 'Spolu:', desc: '' }]);
    } else {
      setItems(items => [...items, { id: Date.now().toString(), type: 'item', title: rowTitle, desc: rowDesc, qty: rowQty, price: rowPrice }]);
    }
    setRowTitle(''); setRowDesc(''); setRowQty(1); setRowPrice(0);
  }

  function handleEditRow(id: string) {
    const row = items.find(i => i.id === id);
    if (!row) return;
    setEditId(id);
    setRowTitle(row.title);
    setRowDesc(row.desc || '');
    setRowQty(row.qty || 1);
    setRowPrice(row.price || 0);
  }

  function handleDeleteRow(id: string) {
    setItems(items => items.filter(i => i.id !== id));
    if (editId === id) {
      setEditId(null);
      setRowTitle(''); setRowDesc(''); setRowQty(1); setRowPrice(0);
    }
  }

  // Výpočty
  const subtotal = items.reduce((sum, i) => i.type === 'item' ? sum + i.qty * i.price : sum, 0);
  const discountAmount = subtotal * (discount / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const vat = vatEnabled ? subtotalAfterDiscount * (vatRate / 100) : 0;
  const total = subtotalAfterDiscount + vat;

  // Autosave při změně položek nebo základních údajů
  useEffect(() => {
    if (!name.trim() || items.length === 0) return;
    onAutosave({
      id: initial?.id || Date.now().toString(),
      name,
      date,
      client,
      clientDetails,
      note,
      total,
      items,
      vatEnabled,
      vatRate,
      tableNote,
      showDetails,
      discount
    });
    onNotify('Všetky zmeny boli automaticky uložené', 'success');
  }, [name, date, client, clientDetails, note, items, vatEnabled, vatRate, tableNote, showDetails, discount]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!name.trim()) {
      setError('Vyplňte názov zákazky.');
      return;
    }
    if (items.length === 0) {
      setError('Pridajte aspoň jednu položku.');
      return;
    }
    onSave({
      id: initial?.id || Date.now().toString(),
      name,
      date,
      client,
      clientDetails,
      note,
      total,
      items,
      vatEnabled,
      vatRate,
      tableNote,
      showDetails,
      discount
    });
    setSuccess(true);
    setTimeout(() => onBack(), 700);
  }

  function handleStartAdd(type: 'item' | 'section' | 'subtotal') {
    setAddType(type);
    setEditRowId('new');
    setEditRow({ type });
  }
  function handleStartEdit(id: string) {
    const row = items.find(i => i.id === id);
    if (!row) return;
    setEditRowId(id);
    setEditRow({ ...row });
  }
  function handleEditChange(field: keyof OfferRow, value: any) {
    setEditRow(r => ({ ...r, [field]: value }));
  }
  function handleSaveEdit() {
    if (editRowId === 'new' && addType) {
      setItems([...items, { ...editRow, id: Date.now().toString(), type: addType } as OfferRow]);
    } else if (editRowId) {
      setItems(items.map(i => i.id === editRowId ? { ...i, ...editRow } as OfferRow : i));
    }
    setEditRowId(null);
    setEditRow(null);
    setAddType(null);
  }
  function handleCancelEdit() {
    setEditRowId(null);
    setEditRow(null);
    setAddType(null);
  }

  const handleAddItem = () => {
    const newItem: ItemRow = {
      id: Date.now().toString(),
      type: 'item',
      title: 'Nová položka',
      desc: '',
      qty: 0,
      price: 0,
      unit: 'ks'
    };
    setItems(items => [...items, newItem]);
  };

  const handleAddSection = () => {
    const newSection: SectionRow = {
      id: Date.now().toString(),
      type: 'section',
      title: 'Nová sekcia',
      desc: ''
    };
    setItems(items => [...items, newSection]);
  };

  const handleAddSubtotal = () => {
    const newSubtotal: SubtotalRow = {
      id: Date.now().toString(),
      type: 'subtotal',
      title: 'Medzisúčet',
      desc: ''
    };
    setItems(items => [...items, newSubtotal]);
  };

  async function handleExportHighResPDF() {
    try {
      // Vytvorenie tempDiv pre PDF export
      const tempDiv = document.createElement('div');
      document.body.appendChild(tempDiv);
      
      // Výpočet cien
      const subtotal = items.reduce((sum, i) => i.type === 'item' ? sum + (i.qty ?? 0) * (i.price ?? 0) : sum, 0);
      const discountAmount = subtotal * (discount / 100);
      const subtotalAfterDiscount = subtotal - discountAmount;
      const vat = vatEnabled ? subtotalAfterDiscount * (vatRate / 100) : 0;
      const total = subtotalAfterDiscount + vat;
      
      // Získame dnešný dátum
      const today = new Date();
      const formattedDate = today.getDate().toString().padStart(2, '0') + '.' + 
                           (today.getMonth() + 1).toString().padStart(2, '0') + '.' + 
                           today.getFullYear();

      // Vytvoríme React root a vykreslíme PDF obsah
      const root = createRoot(tempDiv);
      root.render(
        <div style={{ fontFamily: 'Noto Sans, Arial, sans-serif', padding: 0, margin: 0, background: '#fff' }}>
          {/* Hlavička s logom */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 40px 10px 40px' }}>
            <div style={{ maxWidth: 150, maxHeight: 50 }}>
              {settings.logo ? <img src={settings.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : 
               <div style={{ fontSize: 28, fontWeight: 900, color: '#ccc' }}>LOGO</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{settings.email}</div>
              <div style={{ color: '#666', fontSize: 11 }}>{settings.phone} | {settings.web}</div>
            </div>
          </div>
          
          {/* Názov ponuky */}
          <div style={{ padding: '0 40px 8px 40px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Cenová ponuka</div>
            <div style={{ fontSize: 14, color: '#444', marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>{name}</span>
              <span style={{ fontSize: 11, color: '#888' }}>Dátum: {formattedDate}</span>
            </div>
          </div>
          
          {/* Fakturačné údaje (ak sú zobrazené) */}
          {showDetails && clientDetails && (
            <div style={{ display: 'flex', padding: '12px 40px', gap: 12 }}>
              <div style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: 8, padding: 10, background: '#fafbfe' }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>Fakturačné údaje klienta:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 11, lineHeight: 1.3 }}>
                  <div style={{ width: '100%' }}><strong>{clientDetails.name}</strong></div>
                  {clientDetails.company && <div style={{ width: '100%' }}>{clientDetails.company}</div>}
                  <div style={{ width: '100%' }}>{clientDetails.address}</div>
                  <div style={{ width: '100%' }}>{clientDetails.zip} {clientDetails.city}</div>
                  <div style={{ width: '100%' }}>IČO: {clientDetails.ico}</div>
                  {clientDetails.dic && <div style={{ width: '100%' }}>DIČ: {clientDetails.dic}</div>}
                  {clientDetails.icDph && <div style={{ width: '100%' }}>IČ DPH: {clientDetails.icDph}</div>}
                </div>
              </div>
              <div style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: 8, padding: 10, background: '#fafbfe' }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>Fakturačné údaje dodávateľa:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 11, lineHeight: 1.3 }}>
                  <div style={{ width: '100%' }}><strong>{settings.name}</strong></div>
                  {settings.address && <div style={{ width: '100%' }}>{settings.address}</div>}
                  {(settings.zip || settings.city) && <div style={{ width: '100%' }}>{settings.zip} {settings.city}</div>}
                  <div style={{ width: '100%' }}>IČO: {settings.ico}</div>
                  {settings.dic && <div style={{ width: '100%' }}>DIČ: {settings.dic}</div>}
                  {settings.icDph && <div style={{ width: '100%' }}>IČ DPH: {settings.icDph}</div>}
                </div>
              </div>
            </div>
          )}
          
          {/* Tabuľka s položkami */}
          <div style={{ margin: '18px 40px', border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
            {/* Hlavička tabuľky */}
            <div style={{ display: 'flex', background: '#222', color: 'white', padding: '10px 12px', fontWeight: 700, fontSize: 12 }}>
              <div style={{ flex: 3 }}>Názov položky</div>
              <div style={{ flex: 1, textAlign: 'right' }}>Počet</div>
              <div style={{ flex: 1, textAlign: 'right' }}>Cena (€)</div>
              <div style={{ flex: 1, textAlign: 'right' }}>Spolu (€)</div>
            </div>
            
            {/* Položky */}
            {items.map((item, index) => {
              if (item.type === 'section') {
                return (
                  <div key={item.id} style={{ 
                    padding: '8px 12px', 
                    background: '#f3f3f7', 
                    fontWeight: 700, 
                    fontSize: 13,
                    borderTop: index > 0 ? '1px solid #e0e0e0' : 'none',
                    borderLeft: '6px solid #222'
                  }}>
                    {item.title}
                  </div>
                );
              } else if (item.type === 'subtotal') {
                // Výpočet medzisúčtu pre sekciu
                let lastSectionIndex = -1;
                for (let i = index - 1; i >= 0; i--) {
                  if (items[i].type === 'section') {
                    lastSectionIndex = i;
                    break;
                  }
                }
                
                let sectionTotal = 0;
                for (let i = lastSectionIndex + 1; i < index; i++) {
                  if (items[i].type === 'item') {
                    sectionTotal += (items[i].qty || 0) * (items[i].price || 0);
                  }
                }
                
                return (
                  <div key={item.id} style={{ 
                    display: 'flex', 
                    padding: '6px 12px', 
                    background: '#efefef',
                    borderTop: '1px solid #e0e0e0',
                    fontWeight: 600,
                    fontSize: 12
                  }}>
                    <div style={{ flex: 3, textAlign: 'right' }}>Medzisúčet:</div>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(sectionTotal, '€')}</div>
                  </div>
                );
              } else {
                return (
                  <div key={item.id} style={{ 
                    display: 'flex', 
                    padding: '6px 12px',
                    borderTop: index > 0 ? '1px solid #e0e0e0' : 'none',
                    fontSize: 12
                  }}>
                    <div style={{ flex: 3 }}>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.desc && (
                        <div 
                          className="pdf-bullets" 
                          style={{ color: '#666', fontSize: 10, marginTop: 2, lineHeight: 1.2 }}
                          dangerouslySetInnerHTML={{ __html: extractBullets(item.desc) }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>{item.qty}</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>{item.price?.toFixed(2)} €</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      {((item.qty || 0) * (item.price || 0)).toFixed(2)} €
                    </div>
                  </div>
                );
              }
            })}
          </div>
          
          {/* Sumár */}
          <div style={{ 
            margin: '18px 40px',
            background: '#111',
            color: 'white',
            padding: '12px 16px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pageBreakInside: 'avoid'
          }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {vatEnabled ? 'Celková cena s DPH' : 'Celková cena'}
            </div>
            <div style={{ textAlign: 'right' }}>
              {discount > 0 && (
                <div style={{ marginBottom: 2, fontSize: 12 }}>
                  <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>
                    {formatCurrency(subtotal + (vatEnabled ? subtotal * (vatRate / 100) : 0), '€')}
                  </span>
                  <span style={{ 
                    background: '#c00', 
                    color: 'white', 
                    padding: '1px 6px', 
                    borderRadius: 4, 
                    fontSize: 11, 
                    fontWeight: 700,
                    marginLeft: 6
                  }}>
                    Zľava {discount}%
                  </span>
                </div>
              )}
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                {formatCurrency(total, '€')}
              </div>
              {vatEnabled && (
                <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>
                  Cena bez DPH: {formatCurrency(subtotalAfterDiscount, '€')}
                </div>
              )}
            </div>
          </div>
          
          {/* Poznámky - so zvýšeným marginom a anti-page-break vlastnosťami */}
          {(settings.pdfNote || tableNote) && (
            <div style={{ 
              margin: '16px 40px 0',
              color: '#444',
              fontSize: 10,
              lineHeight: 1.3,
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
              marginBottom: 12
            }}>
              {settings.pdfNote && (
                <div style={{ marginBottom: 4 }}>
                  {/* Odstraňujeme text "Testujem doplnkove informácie" */}
                  {settings.pdfNote.replace(/Testujem doplnkove informácie/g, '')}
                </div>
              )}
              {tableNote && (
                <div>
                  {/* Odstraňujeme text "Testujem doplnkove informácie" */}
                  {tableNote.replace(/Testujem doplnkove informácie/g, '')}
                </div>
              )}
            </div>
          )}
          
          {/* Pätička */}
          <div style={{
            margin: '16px 40px 30px',
            padding: '10px',
            background: '#f3f3f7',
            color: '#888',
            fontSize: 10,
            textAlign: 'center',
            borderRadius: 8,
            pageBreakInside: 'avoid',
            breakInside: 'avoid'
          }}>
            {settings.name} {settings.ico && `| IČO: ${settings.ico}`} {settings.dic && `| DIČ: ${settings.dic}`} {settings.icDph && `| IČ DPH: ${settings.icDph}`}
          </div>
        </div>
      );
      
      // Exportovať pomocou html2pdf
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;
      
      html2pdf().set({
        margin: [15, 10, 15, 10],
        filename: 'cenova-ponuka.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
          scale: 4, 
          useCORS: true,
          allowTaint: true,
          scrollY: 0
        },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      })
      .from(tempDiv.firstChild)
      .save()
      .then(() => {
        root.unmount();
        document.body.removeChild(tempDiv);
      })
      .catch((error: Error) => {
        console.error('Chyba pri exporte PDF:', error);
        root.unmount();
        document.body.removeChild(tempDiv);
        alert(`Chyba pri exporte PDF: ${error.message || error}`);
      });
    } catch (error: unknown) {
      console.error('Chyba:', error);
      if (error instanceof Error) {
        alert(`Chyba pri príprave PDF: ${error.message}`);
      } else {
        alert(`Chyba pri príprave PDF: ${String(error)}`);
      }
    }
  }

  // Live preview editor - hlavný wrapper
  return (
    <div className="offer-card offer-live-preview">
      {/* LOGO a HLAVIČKA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ minHeight: 60, minWidth: 180, display: 'flex', alignItems: 'center' }}>
          {settings.logo && settings.logo.length > 0 ? (
            <img
              src={settings.logo}
              alt="Logo"
              style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}
            />
          ) : (
            <div style={{ color: '#bbb', fontSize: 36, fontWeight: 900, letterSpacing: 2 }}>LOGO</div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: 14, color: '#888', display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'Noto Sans', fontWeight: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', fontSize: 13 }}>Email:</span>
            <input 
              type="text" 
              value={settings.email || ''} 
              onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
              style={{ width: 200, padding: '4px 8px', border: '1px solid #dde6f3', borderRadius: 4, fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', fontSize: 13 }}>Telefón:</span>
            <input 
              type="text" 
              value={settings.phone || ''} 
              onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
              style={{ width: 200, padding: '4px 8px', border: '1px solid #dde6f3', borderRadius: 4, fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', fontSize: 13 }}>Web:</span>
            <input 
              type="text" 
              value={settings.web || ''} 
              onChange={(e) => setSettings(prev => ({ ...prev, web: e.target.value }))}
              style={{ width: 200, padding: '4px 8px', border: '1px solid #dde6f3', borderRadius: 4, fontSize: 13 }}
            />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: '1px solid rgba(0,0,0,0.03)' }} contentEditable suppressContentEditableWarning onBlur={e => setName(e.currentTarget.textContent || '')}>
        {name || 'Názov ponuky'}
      </div>
      
      {/* Klient + fakturačné údaje + switch vedľa seba */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}></div>
        <button
          onClick={() => setIsClientModalOpen(true)}
          style={{
            padding: '8px 16px',
            background: '#2346a0',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 500
          }}
        >
          <FaUser size={14} />
          {clientDetails ? 'Upraviť fakturačné údaje' : 'Pridať fakturačné údaje'}
        </button>
        {/* Switch for fakturačné údaje v PDF */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500, cursor: 'pointer', marginLeft: 8 }}>
          <span style={{ fontSize: 14 }}>Zobraziť vo PDF</span>
          <span style={{ position: 'relative', display: 'inline-block', width: 36, height: 20 }}>
            <input type="checkbox" checked={showDetails} onChange={e => setShowDetails(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: showDetails ? '#2346a0' : '#ccc',
              borderRadius: 20,
              transition: 'background 0.2s',
            }}></span>
            <span style={{
              position: 'absolute',
              left: showDetails ? 18 : 2,
              top: 2,
              width: 16,
              height: 16,
              background: '#fff',
              borderRadius: '50%',
              boxShadow: '0 1px 4px #0002',
              transition: 'left 0.2s',
            }}></span>
          </span>
        </label>
      </div>
      
      {/* POLOŽKY A SEKCIÁ */}
      <ErrorBoundary>
        <DndContext
          sensors={useSensors(
            useSensor(PointerSensor),
            useSensor(KeyboardSensor, {
              coordinateGetter: sortableKeyboardCoordinates,
            })
          )}
          collisionDetection={closestCenter}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
              setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
              });
            }
          }}
        >
          <SortableContext
            items={items.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Header row */}
            <div className="offer-grid-header" style={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: '#2346a0', background: '#fafdff', borderRadius: 8, marginBottom: 0, padding: '2px 0 2px 0', fontSize: 15 }}>
              <div style={{ width: 32, minWidth: 32 }}></div>
              <div style={{ flex: 3, minWidth: 180, padding: '0 8px' }}>Názov položky</div>
              <div style={{ flex: 1, textAlign: 'right', padding: '0 8px' }}>Počet</div>
              <div style={{ flex: 1, textAlign: 'right', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Cena <span style={{ marginLeft: 4, fontWeight: 400, color: '#2346a0' }}>€</span></div>
              <div style={{ flex: 1, textAlign: 'right', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Medzisúčet <span style={{ marginLeft: 4, fontWeight: 400, color: '#2346a0' }}>€</span></div>
              <div style={{ width: 48 }}></div>
            </div>
            <div className="offer-grid-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, marginTop: 0 }}>
              {items.map((item, idx) => {
                const isSection = item.type === 'section';
                const isSubtotal = item.type === 'subtotal';
                return (
                  <SortableItem
                    key={item.id}
                    item={item}
                    index={idx}
                    isSection={isSection}
                    isSubtotal={isSubtotal}
                    onEdit={handleEditRow}
                    onDelete={handleDeleteRow}
                    items={items}
                    currency={settings.currency || '€'}
                    setItems={setItems}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </ErrorBoundary>
      {/* Pridávací riadok mimo Droppable */}
      <div style={{ textAlign: 'center', padding: 24 }}>
        <button type="button" className="add-row-btn" onClick={handleAddItem}>+ Pridať položku</button>
        <button type="button" className="add-row-btn" onClick={handleAddSection} style={{ marginLeft: 16 }}>+ Pridať sekciu</button>
        <button type="button" className="add-row-btn" onClick={handleAddSubtotal} style={{ marginLeft: 16 }}>+ Pridať medzisúčet</button>
      </div>
      {/* DPH a sadzba - iPhone style switch */}
      <div style={{ margin: '32px 0 0 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>DPH:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={vatEnabled}
              onChange={e => setVatEnabled(e.target.checked)}
              style={{ margin: 0 }}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={vatRate}
              onChange={e => setVatRate(Number(e.target.value))}
              disabled={!vatEnabled}
              style={{ width: 60, padding: '4px 8px', border: '1px solid #dde6f3', borderRadius: 4 }}
            />
            <span style={{ color: '#666' }}>%</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Zľava:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={e => setDiscount(Number(e.target.value))}
              style={{ width: 60, padding: '4px 8px', border: '1px solid #dde6f3', borderRadius: 4 }}
            />
            <span style={{ color: '#666' }}>%</span>
          </div>
        </div>
      </div>
      {/* SUMÁR */}
      <div style={{ background: '#111', color: '#fff', borderRadius: 12, margin: '24px 0 12px 0', width: '100%', boxShadow: '0 2px 12px #1115', display: 'flex', flexDirection: 'row', overflow: 'hidden', fontFamily: 'Noto Sans', alignItems: 'center' }}>
        {/* Ľavá strana: nadpis */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '18px 16px 18px 22px' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{vatEnabled ? 'Celková cena s DPH' : 'Celková cena'}</span>
        </div>
        {/* Pravá strana: ceny a badge */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', padding: '18px 22px 18px 16px', gap: 5 }}>
          {(discount > 0 || vatEnabled) && (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              {discount > 0 && (
                <span style={{ textDecoration: 'line-through', color: '#fff', opacity: 0.7, fontWeight: 700, fontSize: 15 }}>{formatCurrency(vatEnabled ? subtotal + vat : subtotal)}</span>
              )}
              {discount > 0 && (
                <span style={{ background: '#c00', color: '#fff', fontWeight: 700, fontSize: 12, borderRadius: 5, padding: '3px 10px' }}>Zľava {discount}%</span>
              )}
            </div>
          )}
          <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 4 }}>{formatCurrency(total)}</span>
          {vatEnabled ? (
            <span style={{ fontSize: 11, color: '#bbb', fontWeight: 400, marginTop: 4 }}>Cena bez DPH: {formatCurrency(subtotalAfterDiscount)}</span>
          ) : (
            <span style={{ fontSize: 11, color: '#bbb', fontWeight: 400, marginTop: 4 }}>Cena bez DPH</span>
          )}
        </div>
      </div>
      {/* Poznámky a podmienky */}
      {(settings.pdfNote || tableNote) && (
        <div style={{ 
          color: '#444', 
          fontSize: 12, 
          margin: '35px 40px 0 40px', 
          lineHeight: 1.5, 
          pageBreakInside: 'avoid', 
          pageBreakBefore: 'auto',
          breakInside: 'avoid'
        }}>
          {settings.pdfNote && <div style={{ marginBottom: 8 }}>{settings.pdfNote}</div>}
          {tableNote && <div>{tableNote}</div>}
        </div>
      )}
      {/* Footer v šedom pruhu */}
      <div style={{ background: '#f3f3f7', color: '#888', fontSize: 13, textAlign: 'center', borderRadius: 6, padding: 14, marginTop: 24, letterSpacing: 0.5 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', fontSize: 13 }}>Názov firmy:</span>
            <input 
              type="text" 
              value={settings.name || ''} 
              onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
              style={{ width: 150, padding: '4px 8px', border: '1px solid #dde6f3', borderRadius: 4, fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', fontSize: 13 }}>IČO:</span>
            <input 
              type="text" 
              value={settings.ico || ''} 
              onChange={(e) => setSettings(prev => ({ ...prev, ico: e.target.value }))}
              style={{ width: 100, padding: '4px 8px', border: '1px solid #dde6f3', borderRadius: 4, fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', fontSize: 13 }}>DIČ:</span>
            <input 
              type="text" 
              value={settings.dic || ''} 
              onChange={(e) => setSettings(prev => ({ ...prev, dic: e.target.value }))}
              style={{ width: 100, padding: '4px 8px', border: '1px solid #dde6f3', borderRadius: 4, fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', fontSize: 13 }}>IČ DPH:</span>
            <input 
              type="text" 
              value={settings.icDph || ''} 
              onChange={(e) => setSettings(prev => ({ ...prev, icDph: e.target.value }))}
              style={{ width: 100, padding: '4px 8px', border: '1px solid #dde6f3', borderRadius: 4, fontSize: 13 }}
            />
          </div>
        </div>
      </div>
      {/* Tlačidlá Export, Uložiť, Späť */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 32 }}>
        <button type="button" onClick={handleExportHighResPDF} style={{ background: '#2346a0', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Exportovať PDF</button>
        <button type="submit" onClick={handleSubmit} style={{ background: '#1a8c3b', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Uložiť</button>
        <button type="button" onClick={onBack} style={{ background: '#eee', color: '#2346a0', border: 'none', borderRadius: 6, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Späť</button>
      </div>
      
      {/* Modálne okno pre fakturačné údaje */}
      <ClientDetailsModal 
        isOpen={isClientModalOpen} 
        onClose={() => setIsClientModalOpen(false)} 
        clientDetails={clientDetails} 
        onSave={(details) => {
          setClientDetails(details);
          setIsClientModalOpen(false);
        }} 
      />
    </div>
  );
}

// Add ClientDetailsModal component
function ClientDetailsModal({ isOpen, onClose, clientDetails, onSave }: {
  isOpen: boolean;
  onClose: () => void;
  clientDetails: ClientDetails | null;
  onSave: (details: ClientDetails) => void;
}) {
  const [details, setDetails] = useState<ClientDetails>(clientDetails || {
    name: '',
    company: '',
    ico: '',
    dic: '',
    icDph: '',
    address: '',
    city: '',
    zip: '',
    country: 'Slovensko'
  });

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: 24,
        borderRadius: 10,
        width: '100%',
        maxWidth: 650,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 4px 32px #0002',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 24, color: '#2346a0', fontSize: 22 }}>Fakturačné údaje</h2>
        
        <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
          {/* Klient */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, color: '#333', marginBottom: 16 }}>Údaje klienta</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Meno / Firma</label>
                <input
                  type="text"
                  value={details.name}
                  onChange={e => setDetails((d: ClientDetails) => ({ ...d, name: e.target.value }))}
                  style={{ width: '100%', padding: 6, border: '1px solid #dde6f3', borderRadius: 5, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Spoločnosť</label>
                <input
                  type="text"
                  value={details.company || ''}
                  onChange={e => setDetails((d: ClientDetails) => ({ ...d, company: e.target.value }))}
                  style={{ width: '100%', padding: 6, border: '1px solid #dde6f3', borderRadius: 5, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>IČO</label>
                <input
                  type="text"
                  value={details.ico}
                  onChange={e => setDetails((d: ClientDetails) => ({ ...d, ico: e.target.value }))}
                  style={{ width: '100%', padding: 6, border: '1px solid #dde6f3', borderRadius: 5, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>DIČ</label>
                <input
                  type="text"
                  value={details.dic || ''}
                  onChange={e => setDetails((d: ClientDetails) => ({ ...d, dic: e.target.value }))}
                  style={{ width: '100%', padding: 6, border: '1px solid #dde6f3', borderRadius: 5, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>IČ DPH</label>
                <input
                  type="text"
                  value={details.icDph || ''}
                  onChange={e => setDetails((d: ClientDetails) => ({ ...d, icDph: e.target.value }))}
                  style={{ width: '100%', padding: 6, border: '1px solid #dde6f3', borderRadius: 5, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Adresa</label>
                <input
                  type="text"
                  value={details.address}
                  onChange={e => setDetails((d: ClientDetails) => ({ ...d, address: e.target.value }))}
                  style={{ width: '100%', padding: 6, border: '1px solid #dde6f3', borderRadius: 5, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Mesto</label>
                <input
                  type="text"
                  value={details.city}
                  onChange={e => setDetails((d: ClientDetails) => ({ ...d, city: e.target.value }))}
                  style={{ width: '100%', padding: 6, border: '1px solid #dde6f3', borderRadius: 5, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>PSČ</label>
                <input
                  type="text"
                  value={details.zip}
                  onChange={e => setDetails((d: ClientDetails) => ({ ...d, zip: e.target.value }))}
                  style={{ width: '100%', padding: 6, border: '1px solid #dde6f3', borderRadius: 5, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Krajina</label>
                <input
                  type="text"
                  value={details.country}
                  onChange={e => setDetails((d: ClientDetails) => ({ ...d, country: e.target.value }))}
                  style={{ width: '100%', padding: 6, border: '1px solid #dde6f3', borderRadius: 5, fontSize: 13 }}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px',
              background: '#f3f3f7',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Zrušiť
          </button>
          <button
            onClick={() => {
              onSave(details);
              onClose();
            }}
            style={{
              padding: '7px 16px',
              background: '#2346a0',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Uložiť
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableItem({ 
  item, 
  index, 
  isSection, 
  isSubtotal, 
  onEdit, 
  onDelete, 
  items, 
  currency, 
  setItems 
}: { 
  item: OfferRow;
  index: number;
  isSection: boolean;
  isSubtotal: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  items: OfferRow[];
  currency: string;
  setItems: React.Dispatch<React.SetStateAction<OfferRow[]>>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  // Subtotal calculation for subtotal row
  let subtotalValue = 0;
  if (isSubtotal) {
    // Najdi poslední sekci před tímto subtotalem
    let lastSectionIndex = -1;
    for (let j = index - 1; j >= 0; j--) {
      if (items[j].type === 'section') {
        lastSectionIndex = j;
        break;
      }
    }
    // Spočítej sumu všech položek od poslední sekce po tento subtotal
    for (let j = lastSectionIndex + 1; j < index; j++) {
      const row = items[j];
      if (row.type === 'item') {
        subtotalValue += Number(row.qty ?? 0) * Number(row.price ?? 0);
      }
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 10 : 'auto',
    position: isDragging ? 'relative' as const : undefined,
  };

  // When opening the editor, use the original HTML for Quill
  const handleEditDescOpen = () => {
    setDescDraft(item.desc || '');
    setIsEditingDesc(true);
  };

  // Funkcia na vygenerovanie bullet zoznamu z čistého textu:
  function textToBullets(text: string): string {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    return '<ul>' + lines.map(l => `<li>${l}</li>`).join('') + '</ul>';
  }

  // Funkcia na čistenie HTML z ReactQuill
  function cleanQuillHtml(html: string): string {
    if (!html) return '';
    
    console.log('cleanQuillHtml input:', html);
    
    // Odstráň <p> tagy okolo <ul>
    let cleanedHtml = html
      .replace(/<p>\s*<ul/g, '<ul')
      .replace(/<\/ul>\s*<\/p>/g, '</ul>')
      // Zachovaj vnorené <ul> a <li>
      .replace(/<li[^>]*><p[^>]*>([\s\S]*?)<\/p><ul/g, '<li>$1<ul')
      // Odstráň atribúty z <ul> a <li> tagov ale zachovaj štruktúru
      .replace(/<(ul|li)[^>]*>/gi, (match) => {
        if (match.startsWith('<ul')) return '<ul>';
        if (match.startsWith('<li')) return '<li>';
        return match;
      })
      // Odstráň prázdne <p> tagy
      .replace(/<p>\s*<\/p>/gi, '')
      // Odstráň <br> tagy
      .replace(/<br\s*\/?>/gi, '')
      // Vyčisti whitespace
      .replace(/>\s+</g, '><')
      .trim();
    
    console.log('cleanQuillHtml output:', cleanedHtml);
    return cleanedHtml;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`offer-row-card ${isDragging ? 'dragging-row' : ''} ${isSection ? 'section-row' : ''} ${isSubtotal ? 'subtotal-row' : ''}`}
    >
      <div {...attributes} {...listeners} className="dnd-handle" style={{ fontSize: 20, padding: '0 12px', cursor: 'grab', userSelect: 'none', color: '#999' }}>☰</div>
      {/* Název/sloupec 1 */}
      <div style={{ flex: 3, minWidth: 180, padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isSubtotal ? (
          <div style={{ fontWeight: 700, fontSize: 17, color: '#2346a0', background: 'none', border: 'none', outline: 'none', marginBottom: 2 }}>
            Cena spolu:
          </div>
        ) : (
          <input
            type="text"
            value={item.title || ''}
            onChange={e => {
              const value = e.target.value;
              setItems(items => items.map((row, j) => j === index ? { ...row, title: value } : row));
            }}
            style={{ fontWeight: isSection ? 700 : 600, fontSize: isSection ? 18 : 17, color: isSection ? '#2346a0' : '#222', background: 'none', border: 'none', outline: 'none', marginBottom: 2, width: '100%' }}
            placeholder={isSection ? 'Názov sekcie' : 'Názov položky'}
          />
        )}
        {item.type === 'item' && (
          <>
            {isEditingDesc ? (
              <div style={{ marginTop: 4 }}>
                <ReactQuill
                  value={descDraft}
                  onChange={(value) => {
                    console.log("ReactQuill onChange:", value);
                    setDescDraft(value);
                  }}
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'bullet' }],
                      [{ 'indent': '-1' }, { 'indent': '+1' }], // allow nested bullets
                      ['clean']
                    ],
                    clipboard: {
                      matchVisual: false // Prevents unwanted HTML tags
                    }
                  }}
                  formats={[
                    'bold', 'italic', 'underline',
                    'list', 'bullet', 'indent'
                  ]}
                  style={{ minHeight: 100, maxHeight: 220, overflowY: 'auto', background: 'transparent' }}
                />
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                  <button
                    onClick={() => {
                      // Ensure proper bullet list format
                      const cleanedDesc = cleanQuillHtml(descDraft);
                      
                      setItems(items => items.map((row, j) => j === index ? { ...row, desc: cleanedDesc } : row));
                      setIsEditingDesc(false);
                    }}
                    style={{
                      padding: '6px 24px',
                      background: '#2346a0',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700
                    }}
                  >
                    Hotovo
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{ color: '#888', fontSize: 11, marginTop: 1, cursor: 'pointer', minHeight: 20, padding: '2px 4px', borderRadius: 4, backgroundColor: 'transparent', transition: 'background-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={handleEditDescOpen}
                dangerouslySetInnerHTML={{ __html: item.desc ? extractBullets(item.desc) : 'Kliknite pre úpravu popisu...' }}
              />
            )}
          </>
        )}
      </div>
      {/* Množství/sloupec 2 */}
      <div style={{ flex: 1, textAlign: 'right', padding: '0 8px' }}>
        {item.type === 'item' ? (
          <input
            type="number"
            min={0}
            value={item.qty || ''}
            onChange={e => {
              const value = Number(e.target.value);
              setItems(items => items.map((row, j) => j === index && row.type === 'item' ? { ...row, qty: value } : row));
            }}
            style={{ minWidth: 40, textAlign: 'right', background: 'none', border: 'none', outline: 'none', fontSize: 16 }}
          />
        ) : null}
      </div>
      {/* Cena/sloupec 3 */}
      <div style={{ flex: 1, textAlign: 'right', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        {item.type === 'item' ? (
          <>
            <input
              type="number"
              min={0}
              step={0.01}
              value={item.price || ''}
              onChange={e => {
                const value = Number(e.target.value);
                setItems(items => items.map((row, j) => j === index && row.type === 'item' ? { ...row, price: value } : row));
              }}
              style={{ minWidth: 60, textAlign: 'right', background: 'none', border: 'none', outline: 'none', fontSize: 16 }}
            />
            <span style={{ marginLeft: 4, color: '#2346a0', fontWeight: 500 }}>€</span>
          </>
        ) : null}
      </div>
      {/* Mezicena/sloupec 4 */}
      <div style={{ flex: 1, textAlign: 'right', padding: '0 8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        {item.type === 'item' ? (
          <>
            {formatCurrency(Number(item.qty ?? 0) * Number(item.price ?? 0), '').trim()}
            <span style={{ marginLeft: 4, color: '#2346a0', fontWeight: 500 }}>€</span>
          </>
        ) : isSubtotal ? (
          <>
            {formatCurrency(subtotalValue, '').trim()}
            <span style={{ marginLeft: 4, color: '#2346a0', fontWeight: 500 }}>€</span>
          </>
        ) : ''}
      </div>
      {/* Delete/ikona */}
      <div style={{ flex: 0, padding: '0 8px' }}>
        <button type="button" className="delete-btn" onClick={() => onDelete(item.id)} aria-label="Vymazať">
          <FaTrash />
        </button>
      </div>
    </div>
  );
}

// Komponent pre nastavenia firmy
function SettingsForm({ settings, onSave, onBack }: { 
  settings: CompanySettings; 
  onSave: (settings: CompanySettings) => void; 
  onBack: () => void; 
}) {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  
  const handleChange = (field: keyof CompanySettings, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="offer-card offer-live-preview" style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 8px 48px #0002', padding: 40, fontFamily: 'Noto Sans, Arial, Helvetica, sans-serif', color: '#222' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#2346a0', marginBottom: 28, letterSpacing: -0.5 }}>Nastavenia firmy</h1>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>Logo firmy</label>
          <LogoUpload 
            value={formData.logo} 
            onChange={(logo: string) => handleChange('logo', logo)}
            onRemove={() => handleChange('logo', '')}
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>Názov firmy</label>
          <input 
            type="text" 
            value={formData.name} 
            onChange={(e) => handleChange('name', e.target.value)}
            style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>IČO</label>
            <input 
              type="text" 
              value={formData.ico} 
              onChange={(e) => handleChange('ico', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>DIČ</label>
            <input 
              type="text" 
              value={formData.dic} 
              onChange={(e) => handleChange('dic', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>IČ DPH</label>
            <input 
              type="text" 
              value={formData.icDph} 
              onChange={(e) => handleChange('icDph', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            />
          </div>
        </div>
        
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2346a0', marginBottom: 16, marginTop: 32 }}>Fakturačné údaje</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>Adresa</label>
            <input 
              type="text" 
              value={formData.address || ''} 
              onChange={(e) => handleChange('address', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
              placeholder="Ulica a číslo"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>Mesto</label>
            <input 
              type="text" 
              value={formData.city || ''} 
              onChange={(e) => handleChange('city', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>PSČ</label>
            <input 
              type="text" 
              value={formData.zip || ''} 
              onChange={(e) => handleChange('zip', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>Krajina</label>
            <input 
              type="text" 
              value={formData.country || 'Slovensko'} 
              onChange={(e) => handleChange('country', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            />
          </div>
        </div>
        
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2346a0', marginBottom: 16, marginTop: 32 }}>Kontaktné údaje</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>E-mail</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={(e) => handleChange('email', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>Telefón</label>
            <input 
              type="tel" 
              value={formData.phone} 
              onChange={(e) => handleChange('phone', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>Web</label>
            <input 
              type="text" 
              value={formData.web} 
              onChange={(e) => handleChange('web', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            />
          </div>
        </div>
        
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2346a0', marginBottom: 16, marginTop: 32 }}>Nastavenia ponúk</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>Predvolená sadzba DPH (%)</label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              value={formData.defaultRate} 
              onChange={(e) => handleChange('defaultRate', Number(e.target.value))}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>Mena</label>
            <select 
              value={formData.currency} 
              onChange={(e) => handleChange('currency', e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16 }}
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="CZK">CZK (Kč)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 15, fontWeight: 600 }}>Poznámka v PDF (podmienky, platobné údaje)</label>
          <textarea 
            value={formData.pdfNote} 
            onChange={(e) => handleChange('pdfNote', e.target.value)}
            style={{ width: '100%', padding: '12px 16px', border: '1px solid #dde6f3', borderRadius: 8, fontSize: 16, minHeight: 100, resize: 'vertical' }}
            placeholder="Napr.: Platba na účet: SK12 3456 7890 1234 5678 9012, Dodanie do 14 dní od úhrady..."
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 32 }}>
          <button 
            type="button" 
            onClick={onBack}
            style={{ background: '#eee', color: '#2346a0', border: 'none', borderRadius: 6, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            Späť
          </button>
          <button 
            type="submit"
            style={{ background: '#1a8c3b', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            Uložiť
          </button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const [offers, setOffers] = useState<OfferItem[]>(() => {
    try {
      const data = localStorage.getItem('offers');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<CompanySettings>(() => {
    try {
      const data = localStorage.getItem('companySettings');
      const parsed = data ? JSON.parse(data) : null;
      // AUTO-FIX: If logo is old escaped SVG, decode it
      if (parsed && typeof parsed.logo === 'string' && parsed.logo.startsWith('data:image/svg+xml;utf8,%3C')) {
        const svgText = decodeURIComponent(parsed.logo.split(',')[1]);
        parsed.logo = 'data:image/svg+xml;utf8,' + svgText;
        localStorage.setItem('companySettings', JSON.stringify(parsed));
      }
      return parsed ? { ...parsed, dic: parsed.dic || '', icDph: parsed.icDph || '' } : {
        name: '', ico: '', dic: '', icDph: '', email: '', phone: '', web: '', logo: '', defaultRate: 0, currency: 'EUR', pdfNote: ''
      };
    } catch {
      return { name: '', ico: '', dic: '', icDph: '', email: '', phone: '', web: '', logo: '', defaultRate: 0, currency: 'EUR', pdfNote: '' };
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [cloneData, setCloneData] = useState<OfferItem | undefined>(undefined);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');

  // Funkce pro autosave z editoru
  const handleAutosave = (offer: OfferItem) => {
    setOffers(prevOffers => {
      const newOffers = [...prevOffers];
      const idx = newOffers.findIndex(o => o.id === offer.id);
      if (idx === -1) {
        newOffers.push(offer);
      } else {
        newOffers[idx] = offer;
      }
      localStorage.setItem('offers', JSON.stringify(newOffers));
      return newOffers;
    });
  };

  // Funkce pro bezpečné ukládání do localStorage
  const saveToLocalStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error saving to localStorage (${key}):`, error);
      setNotification({ message: 'Chyba pri ukladaní zmien', type: 'error' });
      return false;
    }
  };

  const handleNew = () => {
    setEditId(null);
    setCloneData({
      id: Date.now().toString(),
      name: '',
      date: '',
      client: '',
      note: '',
      total: 0,
      items: [],
      vatEnabled: true,
      vatRate: settings.defaultRate || 20,
      tableNote: '',
      discount: 0,
      showDetails: true
    });
    setView('form');
  };

  const handleBack = () => {
    setEditId(null);
    setCloneData(undefined);
    setView('list');
  };

  const handleSelect = (id: string) => { 
    setSelectedId(id); 
    setView('detail'); 
  };

  const handleEdit = (id: string) => {
    setEditId(id);
    setCloneData(undefined);
    setView('form');
  };

  const handleDelete = (id: string) => {
    setOffers(prevOffers => {
      const newOffers = prevOffers.filter(o => o.id !== id);
      if (saveToLocalStorage('offers', newOffers)) {
        setNotification({ message: 'Ponuka bola vymazaná', type: 'info' });
      }
      return newOffers;
    });
  };

  const handleClone = (id: string) => {
    const orig = offers.find(o => o.id === id);
    if (!orig) return;
    
    setCloneData({
      ...orig,
      id: Date.now().toString(),
      date: '',
      name: orig.name + ' (kópia)',
      tableNote: orig.tableNote || '',
    });
    setEditId(null);
    setView('form');
    setNotification({ message: 'Ponuka bola naklonovaná, môžete ju upraviť', type: 'info' });
  };

  const handleSave = (offer: OfferItem) => {
    setOffers(prevOffers => {
      const newOffers = [...prevOffers];
      const idx = newOffers.findIndex(o => o.id === offer.id);
      
      if (idx === -1) {
        newOffers.push(offer);
        if (saveToLocalStorage('offers', newOffers)) {
          setNotification({ message: 'Nová ponuka bola úspešne vytvorená', type: 'success' });
        }
      } else {
        newOffers[idx] = offer;
        if (saveToLocalStorage('offers', newOffers)) {
          setNotification({ message: 'Ponuka bola úspešne aktualizovaná', type: 'success' });
        }
      }
      
      return newOffers;
    });
    
    setEditId(null);
    setCloneData(undefined);
    setView('list');
  };

  const handleSettingsSave = (newSettings: CompanySettings) => {
    if (saveToLocalStorage('companySettings', newSettings)) {
      setNotification({ message: 'Nastavenia boli úspešne uložené', type: 'success' });
    }
    setSettings(newSettings);
    setSettingsOpen(false);
  };

  return (
    <div style={{ background: '#f5f6fa', minHeight: '100vh', padding: 0 }}>
      {view === 'form' ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <OfferForm
            onSave={handleSave}
            onAutosave={handleAutosave}
            initial={editId ? offers.find(o => o.id === editId) : cloneData}
            onBack={handleBack}
            onNotify={(msg: string, type: 'success' | 'error' | 'info') => setNotification({ message: msg, type })}
            settings={settings}
            setSettings={setSettings}
          />
        </div>
      ) : (
        <>
          {/* Top navigation bar with tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 40, marginTop: 40, background: 'transparent', boxShadow: 'none', borderRadius: 0, padding: 0 }}>
            <div style={{ display: 'flex', gap: 0, background: 'transparent', boxShadow: 'none', borderRadius: 0, padding: 0 }}>
              <button
                onClick={() => { setActiveTab('list'); setSettingsOpen(false); setView('list'); }}
                style={{
                  padding: '16px 40px',
                  background: activeTab === 'list' ? '#2346a0' : 'transparent',
                  color: activeTab === 'list' ? '#fff' : '#2346a0',
                  fontWeight: 700,
                  fontSize: 18,
                  border: 'none',
                  borderRadius: activeTab === 'list' ? 12 : 12,
                  cursor: 'pointer',
                  boxShadow: 'none',
                  transition: 'background 0.18s, color 0.18s',
                  marginRight: 2,
                }}
              >
                Cenové ponuky
              </button>
              <button
                onClick={() => { setActiveTab('settings'); setSettingsOpen(true); setView('list'); }}
                style={{
                  padding: '16px 40px',
                  background: activeTab === 'settings' ? '#2346a0' : 'transparent',
                  color: activeTab === 'settings' ? '#fff' : '#2346a0',
                  fontWeight: 700,
                  fontSize: 18,
                  border: 'none',
                  borderRadius: activeTab === 'settings' ? 12 : 12,
                  cursor: 'pointer',
                  boxShadow: 'none',
                  transition: 'background 0.18s, color 0.18s',
                  marginLeft: 2,
                }}
              >
                Nastavenia
              </button>
            </div>
          </div>
          {/* Main content */}
          {activeTab === 'list' && !settingsOpen && (
            <OfferList 
              offers={offers} 
              onNew={handleNew} 
              onSelect={handleSelect} 
              onDelete={handleDelete} 
              onEdit={handleEdit} 
              onClone={handleClone} 
            />
          )}
          {settingsOpen && (
            <SettingsForm 
              settings={settings} 
              onSave={handleSettingsSave} 
              onBack={() => { setSettingsOpen(false); setActiveTab('list'); }} 
            />
          )}
        </>
      )}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
          duration={3000}
        />
      )}
      <style>{`
        .pdf-bullets ul {
          all: unset;
          list-style-type: disc !important;
          padding-left: 18px !important;
          margin: 0 !important;
          display: block !important;
        }
        .pdf-bullets ul li {
          all: unset;
          display: list-item !important;
          list-style-type: disc !important;
          color: #888 !important;
          font-size: 11px !important;
          margin: 0 !important;
          padding: 0 !important;
          background: none !important;
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          gap: 0 !important;
          flex-direction: initial !important;
        }
        .pdf-bullets ul ul {
          padding-left: 24px !important;
          margin-top: 2px !important;
          display: block !important;
        }
        .pdf-bullets ul ul li {
          list-style-type: circle !important;
          color: #999 !important;
          display: list-item !important;
        }
        .ql-editor ul {
          padding-left: 1.5em !important;
        }
        .ql-editor ul ul {
          padding-left: 1.5em !important;
        }
        .ql-editor li {
          list-style-type: disc !important;
        }
        .ql-editor li li {
          list-style-type: circle !important;
        }
        
        /* Dodatočné štýly pre bullet listy */
        .pdf-bullets {
          font-family: 'Noto Sans', sans-serif !important;
        }
        .pdf-bullets ul {
          margin-top: 4px !important;
          margin-bottom: 4px !important;
        }
        .pdf-bullets li {
          line-height: 1.4 !important;
          margin-bottom: 2px !important;
        }
        .ql-container {
          font-family: 'Noto Sans', sans-serif !important;
          font-size: 13px !important;
        }
      `}</style>
    </div>
  );
}

export default App
