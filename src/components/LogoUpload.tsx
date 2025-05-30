import React, { useState, useRef } from 'react';

interface LogoUploadProps {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  isCompanyLogo?: boolean;
}

export function LogoUpload({ value, onChange, onRemove, isCompanyLogo = false }: LogoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const convertSvgToPng = async (svgText: string) => {
    try {
      // Čistenie SVG (rovnaké ako v exporte)
      svgText = svgText.replace(/^\uFEFF/, '');
      svgText = svgText.replace(/<!--[\s\S]*?-->/g, '');
      svgText = svgText.replace(/<\?xml[^>]*>/g, '');
      svgText = svgText.replace(/^[^<]*<svg/, '<svg');
      svgText = svgText.replace(/([a-zA-Z0-9\-]+)='([^']*)'/g, '$1="$2"');
      svgText = svgText.replace(/&[a-zA-Z]+;/g, '');
      svgText = svgText
        .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
        .replace(/<defs>[\s\S]*?<\/defs>/g, '')
        .replace(/<title>[\s\S]*?<\/title>/g, '');
      // Validácia cez DOMParser
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('SVG parser error: ' + parseError.textContent);
      }
      svgText = new XMLSerializer().serializeToString(doc.documentElement);
      // Konverzia cez canvg
      const canvgModule = await import('canvg');
      const Canvg = canvgModule.Canvg;
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Nepodarilo sa vytvoriť canvas.');
      const v = await Canvg.fromString(ctx, svgText);
      await v.render();
      return canvas.toDataURL('image/png');
    } catch (e: any) {
      throw new Error('SVG logo sa nepodarilo skonvertovať na PNG: ' + e.message);
    }
  };

  const handleFile = async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        
        // Debug log pre typ súboru a veľkosť
        console.log(`Logo file: ${file.name}, type: ${file.type}, size: ${Math.round(file.size / 1024)}KB`);
        
        // SVG konverzia
        if (file.type === 'image/svg+xml') {
          let svgText = '';
          if (result.startsWith('data:image/svg+xml;base64,')) {
            console.log('Converting base64 encoded SVG to PNG...');
            svgText = atob(result.split(',')[1]);
          } else if (result.startsWith('data:image/svg+xml;utf8,')) {
            console.log('Converting UTF8 encoded SVG to PNG...');
            svgText = result.split(',')[1];
          } else {
            console.log('Converting raw SVG to PNG...');
            svgText = result;
          }
          try {
            const pngDataUrl = await convertSvgToPng(svgText);
            onChange(pngDataUrl);
            
            // Úspešná konverzia ale s upozornením
            setError('SVG logo bolo skonvertované na PNG pre lepšiu kompatibilitu s PDF exportom');
            
            // Log info o výsledku
            const imgTest = new Image();
            imgTest.onload = () => {
              console.log(`Converted SVG to PNG: ${imgTest.naturalWidth}x${imgTest.naturalHeight}px`);
            };
            imgTest.src = pngDataUrl;
          } catch (svgErr: any) {
            console.error('SVG conversion error:', svgErr);
            setError(`SVG konverzia zlyhala: ${svgErr.message || 'Neznáma chyba'}`);
          }
        } else if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
          // Kontrola veľkosti pre PNG/JPG
          if (file.size > 200 * 1024) { // viac ako 200KB
            setError(`Súbor loga je príliš veľký (${Math.round(file.size / 1024)}KB). Pre najlepšiu kompatibilitu s PDF exportom odporúčame veľkosť do 100KB.`);
          }
          
          onChange(result);
        } else {
          // Iné formáty
          onChange(result);
          setError(`Formát ${file.type} môže mať obmedzenú podporu v PDF exporte. Odporúčame PNG formát.`);
        }
        
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      console.error('File reading error:', e);
      setError('Chyba pri načítaní súboru: ' + e.message);
      setLoading(false);
    }
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
    handleFile(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|svg\+xml|webp)$/)) {
      setError('Podporované formáty: PNG, JPG, SVG, WebP');
      return;
    }
    handleFile(file);
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
        {loading ? (
          <div style={{ color: '#2346a0', fontWeight: 600, fontSize: 16, margin: 16 }}>Konvertujem logo...</div>
        ) : value ? (
          <>
            <LogoDisplay value={value} />
            {isCompanyLogo && (
              <div style={{ 
                background: '#f0f7ff', 
                color: '#2346a0', 
                fontSize: 11, 
                padding: '2px 8px', 
                borderRadius: 10, 
                marginTop: 8,
                fontWeight: 600
              }}>
                Firemné logo
              </div>
            )}
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
      {value && !loading && (
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
          {isCompanyLogo ? 'Upraviť logo' : 'Odstrániť logo'}
        </button>
      )}
    </div>
  );
}

// Pridám nový komponent na zobrazenie loga
function LogoDisplay({ value }: { value: string }) {
  const [imgInfo, setImgInfo] = React.useState<{w:number, h:number}|null>(null);
  const [processedSrc, setProcessedSrc] = React.useState<string>(value);
  const isSvg = value.startsWith('data:image/svg');

  React.useEffect(() => {
    // Convert SVG to PNG if needed
    if (isSvg) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          // Convert to canvas to ensure PDF compatibility
          const canvas = document.createElement('canvas');
          // Make sure canvas is large enough
          canvas.width = img.naturalWidth || 300;
          canvas.height = img.naturalHeight || 100;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const pngUrl = canvas.toDataURL('image/png');
            if (pngUrl && pngUrl !== 'data:,') {
              setProcessedSrc(pngUrl);
              console.log('SVG converted to PNG for PDF compatibility');
              
              // Get size of the processed image
              const processedImg = new window.Image();
              processedImg.onload = () => {
                setImgInfo({w: processedImg.naturalWidth, h: processedImg.naturalHeight});
              };
              processedImg.src = pngUrl;
            }
          }
        } catch (e) {
          console.error('Failed to convert SVG to PNG:', e);
        }
      };
      img.onerror = () => {
        console.error('Error loading SVG image');
      };
      img.src = value;
    } else {
      // For non-SVG images, just set the source and load image info
      setProcessedSrc(value);
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setImgInfo({w: img.naturalWidth, h: img.naturalHeight});
      img.onerror = () => console.error('Error loading image');
      img.src = value;
    }
  }, [value, isSvg]);

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
        src={processedSrc}
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
      {imgInfo && (imgInfo.w < 200 || imgInfo.h < 60) && (
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