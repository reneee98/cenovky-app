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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {value ? (
          <>
            <img
              src={value}
              alt="Logo"
              style={{
                maxWidth: '100%',
                maxHeight: 100,
                objectFit: 'contain',
                marginBottom: 8
              }}
            />
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

export default LogoUpload; 