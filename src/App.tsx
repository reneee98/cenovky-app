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
function OfferForm({ onBack, onSave, onAutosave, initial, onNotify }: { onBack: () => void, onSave: (offer: OfferItem) => void, onAutosave: (offer: OfferItem) => void, initial?: OfferItem, onNotify: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [date, setDate] = useState(initial?.date || '');
  const [client, setClient] = useState(initial?.client || '');
  const [clientDetails, setClientDetails] = useState(initial?.clientDetails || null);
  const [note, setNote] = useState(initial?.note || '');
  const [items, setItems] = useState<OfferRow[]>(initial?.items || []);
  const [vatEnabled, setVatEnabled] = useState(initial?.vatEnabled ?? true);
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? 20);
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
  const [settings, setSettings] = useState<CompanySettings>(() => {
    try {
      const data = localStorage.getItem('companySettings');
      const parsed = data ? JSON.parse(data) : null;
      return parsed ? { ...parsed, dic: parsed.dic || '', icDph: parsed.icDph || '' } : {
        name: '', ico: '', dic: '', icDph: '', email: '', phone: '', web: '', logo: '', defaultRate: 0, currency: 'EUR', pdfNote: ''
      };
    } catch {
      return { name: '', ico: '', dic: '', icDph: '', email: '', phone: '', web: '', logo: '', defaultRate: 0, currency: 'EUR', pdfNote: '' };
    }
  });

  const [address, setAddress] = useState(settings.address || '');
  const [zip, setZip] = useState(settings.zip || '');
  const [city, setCity] = useState(settings.city || '');
  const [country, setCountry] = useState(settings.country || 'Slovensko');

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
      clientDetails,
      note,
      total,
      items,
      vatEnabled,
      vatRate,
      tableNote,
      showDetails,
    });
    onNotify('Všetky zmeny boli automaticky uložené', 'success');
  }, [name, date, client, clientDetails, note, items, vatEnabled, vatRate, tableNote, showDetails]);

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
    // Priprav logo na export (ak SVG, konvertuj na PNG cez canvg)
    let exportLogo = settings.logo;
    if (settings.logo && settings.logo.startsWith('data:image/svg')) {
      // Dynamicky importuj canvg
      const { Canvg } = await import('canvg');
      let svgData = '';
      if (settings.logo.startsWith('data:image/svg+xml;base64,')) {
        svgData = atob(settings.logo.split(',')[1]);
      } else if (
        settings.logo.startsWith('data:image/svg+xml;utf8,') ||
        settings.logo.startsWith('data:image/svg+xml,')
      ) {
        svgData = decodeURIComponent(settings.logo.split(',')[1]);
      } else {
        svgData = settings.logo;
      }
      // Odstráň všetko pred <svg
      const svgStart = svgData.indexOf('<svg');
      if (svgStart !== -1) {
        svgData = svgData.slice(svgStart);
      }
      // Nahradím všetky ' za " pre validné XML
      svgData = svgData.replace(/'/g, '"');
      // Kompletné čistenie SVG pre canvg
      svgData = svgData
        .replace(/class=["']cls-1["']/g, 'fill-rule="evenodd"')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
        .replace(/<defs>[\s\S]*?<\/defs>/g, '')
        .replace(/<title>[\s\S]*?<\/title>/g, '')
        .replace(/class=["'][^"']*["']/g, '');
      // Odstráň všetky atribúty z <svg ...> okrem xmlns a viewBox
      svgData = svgData.replace(
        /<svg[^>]*xmlns=["'][^"']*["'][^>]*viewBox=["'][^"']*["'][^>]*>/,
        match => {
          const xmlns = match.match(/xmlns=["'][^"']*["']/)?.[0] || '';
          const viewBox = match.match(/viewBox=["'][^"']*["']/)?.[0] || '';
          return `<svg ${xmlns} ${viewBox}>`;
        }
      );
      // Odstráň id, data-name a iné neštandardné atribúty z <svg> a <path>
      svgData = svgData
        .replace(/ id=["'][^"']*["']/g, '')
        .replace(/ data-name=["'][^"']*["']/g, '');
      console.log('SVG pre canvg FINAL:', svgData.slice(0, 300));
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const v = await Canvg.fromString(ctx, svgData);
        await v.render();
        exportLogo = canvas.toDataURL('image/png');
      }
    }
    // Vytvor dočasný kontajner mimo obrazovky
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.zIndex = '-1';
    document.body.appendChild(tempDiv);

    // Vyrenderuj OfferExportPreview do tempDiv
    import('react-dom').then(ReactDOM => {
      ReactDOM.render(
        <OfferExportPreview
          name={name}
          date={date}
          client={client}
          clientDetails={clientDetails}
          note={note}
          items={items}
          vatEnabled={vatEnabled}
          vatRate={vatRate}
          total={total}
          tableNote={tableNote}
          settings={{ ...settings, logo: exportLogo }}
          showSupplierDetails={showDetails}
          showClientDetails={showDetails}
        />,
        tempDiv,
        () => {
          import('html2pdf.js').then(html2pdf => {
            html2pdf.default()
              .set({
                margin: 0,
                filename: 'ponuka-kvalitna.pdf',
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { scale: 4, useCORS: true },
                jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
              })
              .from(tempDiv.firstChild)
              .save()
              .then(() => {
                ReactDOM.unmountComponentAtNode(tempDiv);
                document.body.removeChild(tempDiv);
              });
          });
        }
      );
    });
  }

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
              style={{ color: '#222', fontSize: 40, fontWeight: 700, cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.03)' }}
              contentEditable
              suppressContentEditableWarning
              onBlur={e => setSettings(s => ({ ...s, logo: e.currentTarget.textContent || '' }))}
            >
              {settings.logo || 'LOGO'}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: 16, color: '#888' }}>
          <span style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }} contentEditable suppressContentEditableWarning onBlur={e => setSettings(s => ({ ...s, phone: e.currentTarget.textContent || '' }))}>{settings.phone || '+421 900 000 000'}</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }} contentEditable suppressContentEditableWarning onBlur={e => setSettings(s => ({ ...s, email: e.currentTarget.textContent || '' }))}>{settings.email || 'info@email.sk'}</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }} contentEditable suppressContentEditableWarning onBlur={e => setSettings(s => ({ ...s, web: e.currentTarget.textContent || '' }))}>{settings.web || 'www.web.sk'}</span>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <span style={{ fontSize: 15 }}>S DPH</span>
          <span style={{ position: 'relative', display: 'inline-block', width: 36, height: 20 }}>
            <input type="checkbox" checked={vatEnabled} onChange={e => setVatEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: vatEnabled ? '#2346a0' : '#ccc',
              borderRadius: 20,
              transition: 'background 0.2s',
            }}></span>
            <span style={{
              position: 'absolute',
              left: vatEnabled ? 18 : 2,
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
      <div className="table-note" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }} contentEditable suppressContentEditableWarning onBlur={e => setTableNote(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: tableNote || 'Doplňujúce informácie, podmienky, atď.' }} />
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
        <button
          type="button"
          onClick={handleExportHighResPDF}
          style={{
            padding: '14px 32px',
            background: '#2346a0',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 700,
            cursor: 'pointer',
            marginLeft: 8
          }}
        >
          Exportovať PDF (kvalitný screenshot)
        </button>
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
      <ClientDetailsModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clientDetails={clientDetails}
        onSave={setClientDetails}
      />
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
      <div className="button-row" style={{marginTop: 24, marginBottom: 24}}>
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
  const [dic, setDic] = useState(settings.dic || '');
  const [icDph, setIcDph] = useState(settings.icDph || '');
  const [email, setEmail] = useState(settings.email);
  const [phone, setPhone] = useState(settings.phone || '');
  const [web, setWeb] = useState(settings.web || '');
  const [logo, setLogo] = useState(settings.logo);
  const [defaultRate, setDefaultRate] = useState(settings.defaultRate);
  const [currency, setCurrency] = useState(settings.currency);
  const [pdfNote, setPdfNote] = useState(settings.pdfNote || '');
  const [address, setAddress] = useState(settings.address || '');
  const [zip, setZip] = useState(settings.zip || '');
  const [city, setCity] = useState(settings.city || '');
  const [country, setCountry] = useState(settings.country || 'Slovensko');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name, ico, dic, icDph, address, zip, city, country, email, phone, web, logo, defaultRate, currency, pdfNote });
    onBack();
  }

  return (
    <div className="offer-card offer-live-preview" style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 16, boxShadow: '0 8px 48px #0002', padding: 40, fontFamily: 'Noto Sans, Arial, Helvetica, sans-serif', color: '#222' }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: '#2346a0', marginBottom: 28, letterSpacing: -0.5 }}>Nastavenia firmy / freelancera</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: '#2346a0', fontSize: 18, marginBottom: 10 }}>Firemné údaje</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Názov:<br/>
                <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #dde6f3', borderRadius: 6, fontSize: 15 }} />
              </label>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>IČO:<br/>
                <input value={ico} onChange={e => setIco(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #dde6f3', borderRadius: 6, fontSize: 15 }} />
              </label>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>DIČ:<br/>
                <input value={dic} onChange={e => setDic(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #dde6f3', borderRadius: 6, fontSize: 15 }} />
              </label>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>IČ DPH:<br/>
                <input value={icDph} onChange={e => setIcDph(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #dde6f3', borderRadius: 6, fontSize: 15 }} />
              </label>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Adresa:<br/>
                <input value={address} onChange={e => setAddress(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #dde6f3', borderRadius: 6, fontSize: 15 }} />
              </label>
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Mesto:<br/>
                <input value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #dde6f3', borderRadius: 6, fontSize: 15 }} />
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>PSČ:<br/>
                <input value={zip} onChange={e => setZip(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #dde6f3', borderRadius: 6, fontSize: 15 }} />
              </label>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Krajina:<br/>
                <input value={country} onChange={e => setCountry(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #dde6f3', borderRadius: 6, fontSize: 15 }} />
              </label>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #dde6f3', margin: '18px 0' }}></div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: '#2346a0', fontSize: 18, marginBottom: 10 }}>PDF nastavenia</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>Poznámka pre PDF (bude pod tabuľkou):<br/>
                <textarea value={pdfNote} onChange={e => setPdfNote(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #dde6f3', borderRadius: 6, fontSize: 15 }} />
              </label>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="submit" style={{ padding: '12px 32px', background: '#2346a0', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 700, boxShadow: '0 2px 8px #2346a033', transition:'background 0.18s' }}>Uložiť</button>
          <button type="button" onClick={onBack} style={{ padding: '12px 32px', background: '#666', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 700, boxShadow: '0 2px 8px #6662', transition:'background 0.18s' }}>Späť</button>
        </div>
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

function OfferExportPreview({ name, date, client, clientDetails, note, items, vatEnabled, vatRate, total, tableNote, settings, showSupplierDetails = true, showClientDetails = true }: any) {
  // Moderný layout, krásny export
  const subtotal = items.reduce((sum: number, i: any) => i.type === 'item' ? sum + (i.qty ?? 0) * (i.price ?? 0) : sum, 0);
  const vat = vatEnabled ? subtotal * (vatRate ?? 0) / 100 : 0;
  const clientBoxRef = useRef<HTMLDivElement>(null);
  const supplierBoxRef = useRef<HTMLDivElement>(null);
  const [boxHeight, setBoxHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (clientBoxRef.current && supplierBoxRef.current) {
      const h1 = clientBoxRef.current.offsetHeight;
      const h2 = supplierBoxRef.current.offsetHeight;
      setBoxHeight(Math.max(h1, h2));
    }
  }, [clientDetails, settings]);
  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 8px 48px #0002',
      padding: 36,
      fontFamily: 'Noto Sans, Arial, Helvetica, sans-serif',
      color: '#222',
      minHeight: 900,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header: logo + kontakty */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ minHeight: 60, minWidth: 180, display: 'flex', alignItems: 'center' }}>
          {settings.logo && settings.logo.startsWith('data:') ? (
            <img
              src={settings.logo}
              alt="Logo"
              style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}
            />
          ) : (
            <div style={{ color: '#bbb', fontSize: 36, fontWeight: 900, letterSpacing: 2 }}>LOGO</div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: 14, color: '#222', lineHeight: 1.4 }}>
          <div style={{ color: '#2346a0', fontWeight: 700, fontSize: 16 }}>{settings.email}</div>
          <div style={{ color: '#888', fontSize: 14 }}>{settings.phone} | {settings.web}</div>
        </div>
      </div>
      {/* Nadpis */}
      <div style={{ fontSize: 28, fontWeight: 900, color: '#2346a0', marginBottom: 4, letterSpacing: -0.5 }}>Cenová ponuka</div>
      <div style={{ color: '#888', fontSize: 16, marginBottom: 8, fontWeight: 500 }}>{name}</div>
      <div style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>{date && <>Dátum: {date}</>}</div>
      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {showClientDetails && clientDetails && (
            <div ref={clientBoxRef} style={{ background: '#fafdff', padding: 10, borderRadius: 6, fontSize: 12, color: '#444', lineHeight: 1.3, minHeight: boxHeight, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              <div style={{ fontWeight: 600, color: '#2346a0', marginBottom: 6, fontSize: 13 }}>Fakturačné údaje klienta:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontWeight: 500 }}>{clientDetails.name}</div>
                <div>{clientDetails.address}</div>
                <div>{clientDetails.zip}</div>
                <div>{clientDetails.city}</div>
                <div>{clientDetails.country}</div>
                <div>IČO: {clientDetails.ico}</div>
                {clientDetails.dic && <div>DIČ: {clientDetails.dic}</div>}
                {clientDetails.icDph && <div>IČ DPH: {clientDetails.icDph}</div>}
              </div>
            </div>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          {showSupplierDetails && (
            <div ref={supplierBoxRef} style={{ background: '#fafdff', padding: 10, borderRadius: 6, fontSize: 12, color: '#444', lineHeight: 1.3, minHeight: boxHeight, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              <div style={{ fontWeight: 600, color: '#2346a0', marginBottom: 6, fontSize: 13 }}>Fakturačné údaje dodávateľa:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontWeight: 500 }}>{settings.name}</div>
                <div>{settings.address}</div>
                <div>{settings.zip}</div>
                <div>{settings.city}</div>
                <div>{settings.country}</div>
                <div>IČO: {settings.ico}</div>
                {settings.dic && <div>DIČ: {settings.dic}</div>}
                {settings.icDph && <div>IČ DPH: {settings.icDph}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Tabuľka položiek */}
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, marginBottom: 28, fontSize: 14, background: '#fafdff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 8px #0001' }}>
        <thead>
          <tr style={{ background: '#eaf1fb', color: '#2346a0', fontWeight: 800 }}>
            <th style={{ padding: 10, border: '1px solid #dde6f3', textAlign: 'left', fontSize: 14 }}>Názov položky / Popis</th>
            <th style={{ padding: 10, border: '1px solid #dde6f3', textAlign: 'right', fontSize: 14 }}>Počet</th>
            <th style={{ padding: 10, border: '1px solid #dde6f3', textAlign: 'right', fontSize: 14 }}>Cena (€)</th>
            <th style={{ padding: 10, border: '1px solid #dde6f3', textAlign: 'right', fontSize: 14 }}>Medzisúčet (€)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => (
            item.type === 'section' ? (
              <tr key={idx} style={{ background: '#f3f7fd' }}>
                <td colSpan={4} style={{ padding: 8, fontWeight: 800, color: '#2346a0', fontSize: 15, border: '1px solid #dde6f3', borderLeft: '4px solid #2346a0', background: '#f3f7fd' }}>{item.title}</td>
              </tr>
            ) : item.type === 'subtotal' ? (
              <tr key={idx} style={{ background: '#eaf1fb' }}>
                <td colSpan={3} style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#2346a0', border: '1px solid #dde6f3', fontSize: 14 }}>Cena spolu:</td>
                <td style={{ padding: 8, textAlign: 'right', fontWeight: 900, color: '#2346a0', border: '1px solid #dde6f3', fontSize: 15 }}>{subtotal.toFixed(2)} €</td>
              </tr>
            ) : (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f6fafd' }}>
                <td style={{ padding: 8, border: '1px solid #dde6f3' }}>
                  <div style={{ fontWeight: 700, color: '#222', fontSize: 14 }}>{item.title}</div>
                  {item.desc && <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>{item.desc}</div>}
                </td>
                <td style={{ padding: 8, border: '1px solid #dde6f3', textAlign: 'right', fontWeight: 500 }}>{item.qty}</td>
                <td style={{ padding: 8, border: '1px solid #dde6f3', textAlign: 'right', fontWeight: 500 }}>{item.price !== undefined ? item.price.toFixed(2) + ' €' : ''}</td>
                <td style={{ padding: 8, border: '1px solid #dde6f3', textAlign: 'right', fontWeight: 700 }}>{((item.qty ?? 0) * (item.price ?? 0)).toFixed(2)} €</td>
              </tr>
            )
          ))}
        </tbody>
      </table>
      {/* Sumár v čiernom boxe */}
      <div style={{ background: '#111', color: '#fff', borderRadius: 8, padding: '24px 28px', margin: '24px 0 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px #0002' }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 0.5 }}>Výsledná cena spolu:</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>{total.toFixed(2)} {settings.currency}</div>
          {vatEnabled && <div style={{ fontSize: 14, color: '#ccc', fontWeight: 400, marginTop: 2 }}>vrátane DPH ({vatRate}%)</div>}
        </div>
      </div>
      {/* Poznámky a podmienky */}
      {(settings.pdfNote || note || tableNote) && (
        <div style={{ color: '#666', fontSize: 12, marginBottom: 24, lineHeight: 1.4 }}>
          {settings.pdfNote && <div style={{ marginBottom: 4 }}>{settings.pdfNote}</div>}
          {note && <div style={{ marginBottom: 4 }}>{note}</div>}
          {tableNote && <div>{tableNote}</div>}
        </div>
      )}
      {/* Footer v šedom pruhu */}
      <div style={{ background: '#f3f3f7', color: '#888', fontSize: 13, textAlign: 'center', borderRadius: 6, padding: 14, marginTop: 24, letterSpacing: 0.5 }}>
        {settings.name} | IČO: {settings.ico} | {settings.email} | {settings.web}
      </div>
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
        padding: 18,
        borderRadius: 10,
        width: '100%',
        maxWidth: 420,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 4px 32px #0002',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 16, color: '#2346a0', fontSize: 20 }}>Fakturačné údaje klienta</h2>
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
              value={details.dic}
              onChange={e => setDetails((d: ClientDetails) => ({ ...d, dic: e.target.value }))}
              style={{ width: '100%', padding: 6, border: '1px solid #dde6f3', borderRadius: 5, fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 13 }}>IČ DPH</label>
            <input
              type="text"
              value={details.icDph}
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
    </div>
  );
}

export default App
