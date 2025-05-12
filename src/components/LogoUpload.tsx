import React, { useState, useRef } from 'react';

interface LogoUploadProps {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}

// Lepšie escapovanie SVG pre DataURL
function escapeSvgForDataUrl(svg: string): string {
  return svg
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .replace(/"/g, "'")
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/&/g, '%26');
}

function svgDataUrlToUtf8DataUrl(svgDataUrl: string): string {
  if (svgDataUrl.startsWith('data:image/svg+xml;base64,')) {
    const base64 = svgDataUrl.replace('data:image/svg+xml;base64,', '');
    const svgText = atob(base64);
    const escaped = escapeSvgForDataUrl(svgText);
    console.log('SVG text:', svgText.slice(0, 200));
    return 'data:image/svg+xml;utf8,' + escaped;
  }
  if (svgDataUrl.startsWith('data:image/svg+xml;utf8,')) {
    const svgText = decodeURIComponent(svgDataUrl.replace('data:image/svg+xml;utf8,', ''));
    const escaped = escapeSvgForDataUrl(svgText);
    return 'data:image/svg+xml;utf8,' + escaped;
  }
  return svgDataUrl;
}

export function LogoUpload({ value, onChange, onRemove }: LogoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError('');

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|svg\+xml|webp)$/)) {
      setError('Podporované formáty: PNG, JPG, SVG, WebP');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (file.type === 'image/svg+xml') {
        onChange(svgDataUrlToUtf8DataUrl(result));
      } else {
        onChange(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      if (result.startsWith('data:image/svg')) {
        // Konverzia SVG na PNG cez canvg
        const { Canvg } = await import('canvg');
        let svgData = '';
        if (result.startsWith('data:image/svg+xml;base64,')) {
          svgData = atob(result.split(',')[1]);
        } else if (
          result.startsWith('data:image/svg+xml;utf8,') ||
          result.startsWith('data:image/svg+xml,')
        ) {
          svgData = decodeURIComponent(result.split(',')[1]);
        } else {
          svgData = result;
        }
        // Odstráň všetko pred <svg
        const svgStart = svgData.indexOf('<svg');
        if (svgStart !== -1) {
          svgData = svgData.slice(svgStart);
        }
        // Kompletné čistenie SVG pre canvg
        svgData = svgData
          .replace(/class=["']cls-1["']/g, 'fill-rule="evenodd"')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
          .replace(/<defs>[\s\S]*?<\/defs>/g, '')
          .replace(/<title>[\s\S]*?<\/title>/g, '')
          .replace(/class=["'][^"']*["']/g, '');
        svgData = svgData.replace(
          /<svg[^>]*xmlns=["'][^"']*["'][^>]*viewBox=["'][^"']*["'][^>]*>/,
          match => {
            const xmlns = match.match(/xmlns=["'][^"']*["']/)?.[0] || '';
            const viewBox = match.match(/viewBox=["'][^"']*["']/)?.[0] || '';
            return `<svg ${xmlns} ${viewBox}>`;
          }
        );
        svgData = svgData
          .replace(/ id=["'][^"']*["']/g, '')
          .replace(/ data-name=["'][^"']*["']/g, '');
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        let pngDataUrl = result;
        if (ctx) {
          try {
            const v = await Canvg.fromString(ctx, svgData);
            await v.render();
            pngDataUrl = canvas.toDataURL('image/png');
          } catch (err) {
            alert('SVG logo sa nepodarilo konvertovať na PNG. Skontrolujte validitu SVG.');
            return;
          }
        }
        onChange(pngDataUrl);
      } else {
        onChange(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#2a4d8f' : '#d1d1d1'}`,
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? '#f0f4f8' : '#fff',
          transition: 'all 0.2s ease',
          position: 'relative',
          minHeight: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {value ? (
          <>
            <LogoDisplay value={value} />
            <div style={{ color: '#666', fontSize: 14 }}>
              Kliknite pre zmenu alebo pretiahnite nové logo
            </div>
          </>
        ) : (
          <div style={{ color: '#666' }}>
            Pretiahnite logo sem alebo kliknite pre výber
            <div style={{ fontSize: 12, marginTop: 4, color: '#999' }}>
              Podporované formáty: PNG, JPG, SVG, WebP
            </div>
          </div>
        )}
      </div>
      {error && (
        <div style={{ color: '#c00', fontSize: 14, marginTop: 8 }}>{error}</div>
      )}
      {value && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#c00',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: 14,
            marginTop: 8
          }}
        >
          Odstrániť logo
        </button>
      )}
    </div>
  );
}

// Pridám nový komponent na zobrazenie loga
function LogoDisplay({ value }: { value: string }) {
  const [imgInfo, setImgInfo] = React.useState<{w:number, h:number}|null>(null);
  const isSvg = value.startsWith('data:image/svg');
  React.useEffect(() => {
    if (!isSvg) {
      const img = new window.Image();
      img.onload = () => setImgInfo({w: img.naturalWidth, h: img.naturalHeight});
      img.src = value;
    } else {
      setImgInfo(null);
    }
  }, [value]);
  return (
    <div style={{
      width: '100%',
      height: 100,
      maxWidth: 300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 8,
      background: '#fff',
      border: '1px solid #eee',
      position: 'relative'
    }}>
      <img
        src={value}
        alt="Logo"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
          margin: '0 auto',
          imageRendering: 'auto',
        }}
        draggable={false}
      />
      {!isSvg && imgInfo && (imgInfo.w < 200 || imgInfo.h < 60) && (
        <div style={{
          position: 'absolute',
          bottom: 2,
          right: 4,
          background: 'rgba(255,255,255,0.8)',
          color: '#c00',
          fontSize: 12,
          padding: '2px 6px',
          borderRadius: 4
        }}>
          Nízke rozlíšenie: {imgInfo.w}×{imgInfo.h}px
        </div>
      )}
    </div>
  );
}

export default LogoUpload; 