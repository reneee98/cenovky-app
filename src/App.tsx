import React, { useState, useEffect } from 'react'
import './App.css'
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2pdf from 'html2pdf.js';
import LogoUpload from './components/LogoUpload';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { OfferPDFDocument, svgToPngDataUrl } from './components/OfferPDFExport';
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
import type { OfferItem, OfferRow, CompanySettings, ItemRow, SectionRow, SubtotalRow } from './types';
import { FaTrash } from 'react-icons/fa';

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
    <div className="section">
      <h1>Cenové ponuky</h1>
      <div className="button-row" style={{marginBottom:32}}>
        <button onClick={onNew}>+ Nová ponuka</button>
      </div>
      <ul>
        {offers.length === 0 && <li>Žiadne ponuky</li>}
        {offers.map(offer => (
          <li key={offer.id}>
            <div className="offer-row-top">
              <b>{offer.name}</b> {offer.date && <span style={{marginLeft:8}}>({offer.date})</span>} – {offer.total.toFixed(2)} €
            </div>
            <div className="offer-row-actions button-row">
              <button onClick={() => onEdit(offer.id)}>Upraviť</button>
              <button onClick={() => onClone(offer.id)}>Klonovať</button>
              <button onClick={() => onDelete(offer.id)}>Zmazať</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Komponent pre formulár ponuky (rozšírený)
function OfferForm({ onBack, onSave, onAutosave, initial, onNotify }: { onBack: () => void, onSave: (offer: OfferItem) => void, onAutosave: (offer: OfferItem) => void, initial?: OfferItem, onNotify: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [date, setDate] = useState(initial?.date || '');
  const [client, setClient] = useState(initial?.client || '');
  const [note, setNote] = useState(initial?.note || '');
  const [items, setItems] = useState<OfferRow[]>(initial?.items || []);
  const [vatEnabled, setVatEnabled] = useState(initial?.vatEnabled ?? true);
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? 20);
  const [rowType, setRowType] = useState<'item' | 'section' | 'subtotal'>('item');
  const [tableNote, setTableNote] = useState(initial?.tableNote || '');

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
  const [settings, setSettings] = useState<CompanySettings>(() => {
    try {
      const data = localStorage.getItem('companySettings');
      return data ? JSON.parse(data) : {
        name: '', ico: '', email: '', phone: '', web: '', logo: '', defaultRate: 0, currency: 'EUR', pdfNote: ''
      };
    } catch {
      return { name: '', ico: '', email: '', phone: '', web: '', logo: '', defaultRate: 0, currency: 'EUR', pdfNote: '' };
    }
  });

  // Přidám state pro PNG logo
  const [logoForPdf, setLogoForPdf] = useState<{src: string, width?: number, height?: number}|string>(settings.logo);
  useEffect(() => {
    let cancelled = false;
    async function convertLogo() {
      if (settings.logo && settings.logo.startsWith('data:image/svg')) {
        const { dataUrl, width, height } = await svgToPngDataUrl(settings.logo, 120, 60);
        if (!cancelled) setLogoForPdf({ src: dataUrl, width, height });
      } else {
        setLogoForPdf(settings.logo);
      }
    }
    convertLogo();
    return () => { cancelled = true; };
  }, [settings.logo]);

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
  const vat = vatEnabled ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + vat;

  // Autosave při změně položek nebo základních údajů
  useEffect(() => {
    if (!name.trim() || items.length === 0) return;
    onAutosave({
      id: initial?.id || Date.now().toString(),
      name,
      date,
      client,
      note,
      total,
      items,
      vatEnabled,
      vatRate,
      tableNote,
    });
    onNotify('Všetky zmeny boli automaticky uložené', 'success');
  }, [name, date, client, note, items, vatEnabled, vatRate, tableNote]);

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
      note,
      total,
      items,
      vatEnabled,
      vatRate,
      tableNote,
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

  // Live preview editor - hlavný wrapper
  return (
    <div className="offer-card offer-live-preview">
      {/* LOGO a HLAVIČKA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ minHeight: 60, minWidth: 200, display: 'flex', alignItems: 'center' }}>
          {settings.logo && settings.logo.startsWith('data:') ? (
            <img 
              src={settings.logo} 
              alt="Logo" 
              style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }} 
            />
          ) : (
            <div
              style={{ color: '#222', fontSize: 40, fontWeight: 700, cursor: 'pointer' }}
              contentEditable
              suppressContentEditableWarning
              onBlur={e => setSettings(s => ({ ...s, logo: e.currentTarget.textContent || '' }))}
            >
              {settings.logo || 'LOGO'}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: 16, color: '#888' }}>
          <span contentEditable suppressContentEditableWarning onBlur={e => setSettings(s => ({ ...s, phone: e.currentTarget.textContent || '' }))}>{settings.phone || '+421 900 000 000'}</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span contentEditable suppressContentEditableWarning onBlur={e => setSettings(s => ({ ...s, email: e.currentTarget.textContent || '' }))}>{settings.email || 'info@email.sk'}</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span contentEditable suppressContentEditableWarning onBlur={e => setSettings(s => ({ ...s, web: e.currentTarget.textContent || '' }))}>{settings.web || 'www.web.sk'}</span>
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }} contentEditable suppressContentEditableWarning onBlur={e => setName(e.currentTarget.textContent || '')}>
        {name || 'Názov ponuky'}
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
      {/* DPH a sadzba */}
      <div style={{ margin: '32px 0 0 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={vatEnabled}
            onChange={e => setVatEnabled(e.target.checked)}
          />
          S DPH
        </label>
        {vatEnabled && (
          <span>
            sadzba: <input
              type="number"
              min={0}
              max={100}
              value={vatRate}
              onChange={e => setVatRate(Number(e.target.value))}
              style={{ width: 50, padding: 4, border: '1px solid #ddd', borderRadius: 6 }}
            /> %
          </span>
        )}
      </div>
      {/* SUMÁR */}
      <div className="sum-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'left', fontWeight: 500, fontSize: 18, lineHeight: 1.2 }}>
          Výsledná cena spolu:
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>{total.toFixed(2)} €</span>
          {vatEnabled && (
            <span style={{ fontSize: 16, fontWeight: 400, marginTop: 4, color: '#ccc' }}>
              vrátane DPH ({vatRate}%)
            </span>
          )}
        </div>
      </div>
      {/* POZNÁMKA POD TABUĽKOU */}
      <div className="table-note" contentEditable suppressContentEditableWarning onBlur={e => setTableNote(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: tableNote || 'Doplňujúce informácie, podmienky, atď.' }} />
      {/* TLAČIDLÁ */}
      <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'flex-end' }}>
        <button
          type="submit"
          disabled={!name.trim() || items.length === 0}
          style={{
            padding: '14px 32px',
            background: '#2346a0',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 700,
            opacity: (!name.trim() || items.length === 0) ? 0.5 : 1
          }}
        >
          Uložiť ponuku
        </button>
        <PDFDownloadLink
          document={
            <OfferPDFDocument
              offer={{
                id: initial?.id || '',
                name,
                date,
                client,
                note,
                total,
                items,
                vatEnabled,
                vatRate,
                tableNote,
              }}
              settings={{
                ...settings,
                logo: logoForPdf
              }}
            />
          }
          fileName={`ponuka-${name}.pdf`}
        >
          {({ loading }) => (
            <button
              type="button"
              style={{
                padding: '14px 32px',
                background: '#222',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: 8
              }}
            >
              {loading ? 'Generujem PDF...' : 'Exportovať PDF'}
            </button>
          )}
        </PDFDownloadLink>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '14px 32px',
            background: '#666',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 700
          }}
        >
          Späť
        </button>
      </div>
    </div>
  );
}

function OfferPDFPreview({ offer, settings }: { offer: OfferItem, settings: CompanySettings }) {
  const subtotal = offer.items?.reduce((sum, i) => sum + (i.qty || 0) * (i.price || 0), 0) ?? 0;
  const vat = offer.vatEnabled ? subtotal * (offer.vatRate ?? 0) / 100 : 0;
  const total = subtotal + vat;

  const handleExportPDF = () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    html2pdf()
      .set({
        margin: 0,
        filename: `ponuka-${offer.name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
      })
      .from(element)
      .save();
  };

  return (
    <div>
      <div id="pdf-content" style={{ width: '900px', margin: '0 auto', background: '#fff', padding: 32, fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <div style={{ color: '#bbb', fontSize: 48, fontWeight: 700, marginBottom: 16 }}>LOGO</div>
        <div style={{ textAlign: 'right', fontSize: 16, marginBottom: 8 }}>{settings.email}</div>
        <h1 style={{ fontSize: 32, margin: '24px 0 16px 0' }}>Cenová ponuka na {offer.name}</h1>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#eee', fontWeight: 700 }}>
              <th style={{ padding: 8, border: '1px solid #ccc' }}>Názov</th>
              <th style={{ padding: 8, border: '1px solid #ccc' }}>Popis</th>
              <th style={{ padding: 8, border: '1px solid #ccc' }}>Počet</th>
              <th style={{ padding: 8, border: '1px solid #ccc' }}>Cena (EUR)</th>
              <th style={{ padding: 8, border: '1px solid #ccc' }}>Medzisúčet</th>
            </tr>
          </thead>
          <tbody>
            {offer.items?.map((item, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8, border: '1px solid #ccc' }}>{item.title}</td>
                <td style={{ padding: 8, border: '1px solid #ccc' }}>{item.desc}</td>
                <td style={{ padding: 8, border: '1px solid #ccc', textAlign: 'right' }}>{item.qty}</td>
                <td style={{ padding: 8, border: '1px solid #ccc', textAlign: 'right' }}>{item.price?.toFixed(2) || ''}</td>
                <td style={{ padding: 8, border: '1px solid #ccc', textAlign: 'right' }}>
                  {((item.qty || 0) * (item.price || 0)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          <div style={{ marginRight: 32, textAlign: 'right' }}>
            <div>Medzisúčet:</div>
            {offer.vatEnabled && <div>DPH ({offer.vatRate}%):</div>}
          </div>
          <div style={{ minWidth: 120, textAlign: 'right' }}>
            <div>{subtotal.toFixed(2)} EUR</div>
            {offer.vatEnabled && <div>{vat.toFixed(2)} EUR</div>}
          </div>
        </div>
        <div style={{ background: '#222', color: '#fff', fontWeight: 700, fontSize: 28, padding: 16, textAlign: 'right', marginTop: 24 }}>
          {total.toFixed(2)} EUR
        </div>
      </div>
      <button onClick={handleExportPDF} style={{ marginTop: 24 }}>Stiahnuť PDF</button>
    </div>
  );
}

function OfferDetail({ offer, onBack }: { offer: OfferItem, onBack: () => void }) {
  // Načítanie nastavení firmy z localStorage
  let settings: CompanySettings = { name: '', ico: '', email: '', phone: '', web: '', logo: '', defaultRate: 0, currency: 'EUR', pdfNote: '' };
  try {
    const data = localStorage.getItem('companySettings');
    if (data) settings = JSON.parse(data);
  } catch {}

  return (
    <div className="section">
      <OfferPDFPreview offer={offer} settings={settings} />
      <div className="button-row" style={{marginTop: 24, marginBottom: 24}}>
        <PDFDownloadLink
          document={<OfferPDFDocument offer={offer} settings={settings} />}
          fileName={`ponuka-${offer.name}.pdf`}
        >
          {({ loading }) => loading ? 'Generujem PDF...' : 'Stiahnuť PDF (nový export)'}
        </PDFDownloadLink>
        <button type="button" onClick={onBack}>Späť</button>
      </div>
    </div>
  );
}

function SettingsForm({ settings, onSave, onBack }: {
  settings: CompanySettings,
  onSave: (s: CompanySettings) => void,
  onBack: () => void
}) {
  const [name, setName] = useState(settings.name);
  const [ico, setIco] = useState(settings.ico);
  const [email, setEmail] = useState(settings.email);
  const [phone, setPhone] = useState(settings.phone || '');
  const [web, setWeb] = useState(settings.web || '');
  const [logo, setLogo] = useState(settings.logo);
  const [defaultRate, setDefaultRate] = useState(settings.defaultRate);
  const [currency, setCurrency] = useState(settings.currency);
  const [pdfNote, setPdfNote] = useState(settings.pdfNote || '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name, ico, email, phone, web, logo, defaultRate, currency, pdfNote });
    onBack();
  }

  return (
    <div>
      <h2>Nastavenia firmy / freelancera</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Názov:<br/>
            <input value={name} onChange={e => setName(e.target.value)} />
          </label>
        </div>
        <div>
          <label>IČO:<br/>
            <input value={ico} onChange={e => setIco(e.target.value)} />
          </label>
        </div>
        <div>
          <label>E-mail:<br/>
            <input value={email} onChange={e => setEmail(e.target.value)} />
          </label>
        </div>
        <div>
          <label>Telefón:<br/>
            <input value={phone} onChange={e => setPhone(e.target.value)} />
          </label>
        </div>
        <div>
          <label>Web:<br/>
            <input value={web} onChange={e => setWeb(e.target.value)} />
          </label>
        </div>
        <div>
          <label>Logo:<br/>
            <LogoUpload value={logo} onChange={setLogo} onRemove={() => setLogo('')} />
          </label>
        </div>
        <div>
          <label>Predvolená sadzba (€):<br/>
            <input type="number" min={0} value={defaultRate} onChange={e => setDefaultRate(Number(e.target.value))} />
          </label>
        </div>
        <div>
          <label>Mena:<br/>
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="EUR">EUR</option>
              <option value="CZK">CZK</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>
        <div>
          <label>Poznámka pre PDF (bude pod tabuľkou):<br/>
            <textarea value={pdfNote} onChange={e => setPdfNote(e.target.value)} />
          </label>
        </div>
        <button type="submit">Uložiť</button>
        <button type="button" onClick={onBack}>Späť</button>
      </form>
    </div>
  );
}

function formatCurrency(value: number, currency: string = '€') {
  return value.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
}

function SortableItem({ item, index, isSection, isSubtotal, onEdit, onDelete, items, currency, setItems }: {
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

  // Subtotal calculation for subtotal row
  let subtotalValue = 0;
  if (isSubtotal) {
    // Najdi poslední sekci před tímto subtotalem
    let lastSectionIdx = -1;
    for (let j = index - 1; j >= 0; j--) {
      if (items[j].type === 'section') {
        lastSectionIdx = j;
        break;
      }
    }
    // Spočítej sumu všech položek od poslední sekce po tento subtotal
    for (let j = lastSectionIdx + 1; j < index; j++) {
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

  // Save items to window for subtotal calculation
  if (!(window as any).offerItems) (window as any).offerItems = [];
  (window as any).offerItems[index] = item;

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
          <textarea
            value={(item as ItemRow).desc || ''}
            onChange={e => {
              const value = e.target.value;
              setItems(items => items.map((row, j) => j === index && row.type === 'item' ? { ...row, desc: value } : row));
            }}
            style={{ fontSize: 13, color: '#888', minHeight: 18, borderTop: '1px solid #eee', marginTop: 4, paddingTop: 2, background: 'none', borderRadius: 4, border: '1px solid #eee', resize: 'vertical', width: '100%' }}
            placeholder="Popis položky (voliteľné)"
          />
        )}
      </div>
      {/* Množství/sloupec 2 */}
      <div style={{ flex: 1, textAlign: 'right', padding: '0 8px' }}>
        {item.type === 'item' ? (
          <input
            type="number"
            min={0}
            value={(item as ItemRow).qty || ''}
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
              value={(item as ItemRow).price || ''}
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
            {formatCurrency(Number((item as ItemRow).qty ?? 0) * Number((item as ItemRow).price ?? 0), '').trim()}
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
      return data ? JSON.parse(data) : {
        name: '', ico: '', email: '', phone: '', web: '', logo: '', defaultRate: 0, currency: 'EUR', pdfNote: ''
      };
    } catch {
      return { name: '', ico: '', email: '', phone: '', web: '', logo: '', defaultRate: 0, currency: 'EUR', pdfNote: '' };
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [cloneData, setCloneData] = useState<OfferItem | undefined>(undefined);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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
    <div className="container">
      {view === 'list' && !settingsOpen && (
        <button style={{float:'right'}} onClick={() => setSettingsOpen(true)}>Nastavenia</button>
      )}
      {view === 'list' && (
        <OfferList 
          offers={offers} 
          onNew={handleNew} 
          onSelect={handleSelect} 
          onDelete={handleDelete} 
          onEdit={handleEdit} 
          onClone={handleClone} 
        />
      )}
      {view === 'form' && (
        <OfferForm
          onSave={handleSave}
          onAutosave={handleAutosave}
          initial={editId ? offers.find(o => o.id === editId) : cloneData}
          onBack={handleBack}
          onNotify={(msg: string, type: 'success' | 'error' | 'info') => setNotification({ message: msg, type })}
        />
      )}
      {settingsOpen && (
        <SettingsForm 
          settings={settings} 
          onSave={handleSettingsSave} 
          onBack={() => setSettingsOpen(false)} 
        />
      )}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
          duration={3000}
        />
      )}
    </div>
  );
}

export default App
