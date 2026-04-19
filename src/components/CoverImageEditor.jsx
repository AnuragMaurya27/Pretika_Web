/**
 * CoverImageEditor — image upload + text overlay editor
 * Canvas-based: text is BAKED into the final image
 * Output: uploads to /thumbnail/, returns URL via onChange
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { storiesAPI } from '../api/index';
import { getMediaUrl } from '../utils/media';
import { useToast } from './Toast';

// Canvas size (2x for HiDPI quality, displayed at half size)
const CW = 400; // canvas width
const CH = 560; // canvas height (portrait book cover ratio ~5:7)

const COLORS = ['#ffffff','#000000','#ff2244','#ffd700','#00e5ff','#ff9500','#b0ff6f'];
const FONTS  = ['Georgia, serif','Arial, sans-serif','Courier New, monospace','Brush Script MT, cursive'];
const ALIGNS = ['left','center','right'];

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxW && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineH;
    } else { line = test; }
  }
  ctx.fillText(line, x, y);
  return y;
}

export default function CoverImageEditor({ value, onChange }) {
  const toast = useToast();
  const canvasRef   = useRef(null);
  const fileRef     = useRef(null);
  const imgRef      = useRef(null);  // holds loaded Image object
  const dragging    = useRef(null);  // { idx, ox, oy }

  const [uploading, setUploading]   = useState(false);
  const [imgSrc, setImgSrc]         = useState('');
  const [selectedIdx, setSelectedIdx] = useState(null);

  // Text layers: array of { text, x, y, fontSize, color, font, align, bold, italic, shadow, opacity }
  const [layers, setLayers] = useState([
    {
      text: 'Kahani ka naam',
      x: CW / 2, y: CH - 80,
      fontSize: 34,
      color: '#ffffff',
      font: FONTS[0],
      align: 'center',
      bold: true,
      italic: false,
      shadow: true,
      opacity: 1,
    }
  ]);

  // Draw everything on canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);

    // Background
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, CW, CH);
    } else {
      const g = ctx.createLinearGradient(0, 0, CW, CH);
      g.addColorStop(0, '#2d0000'); g.addColorStop(0.5, '#1a0000'); g.addColorStop(1, '#000');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      // Ghost emoji watermark
      ctx.font = '80px serif'; ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.textAlign = 'center'; ctx.fillText('👻', CW/2, CH/2 + 20);
    }

    // Draw each text layer
    layers.forEach((l, i) => {
      ctx.save();
      ctx.globalAlpha = l.opacity ?? 1;
      const style = `${l.bold ? 'bold ' : ''}${l.italic ? 'italic ' : ''}${l.fontSize}px ${l.font}`;
      ctx.font = style;
      ctx.textAlign = l.align || 'center';
      if (l.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      ctx.fillStyle = l.color;
      wrapText(ctx, l.text, l.x, l.y, CW - 40, l.fontSize * 1.3);
      ctx.restore();

      // Selection indicator
      if (i === selectedIdx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(220,20,60,0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        const metrics = ctx.measureText(l.text);
        const w = Math.min(metrics.width + 20, CW - 20);
        const h = l.fontSize * 1.5;
        const ox = l.align === 'center' ? l.x - w/2 : l.align === 'right' ? l.x - w : l.x;
        ctx.strokeRect(ox, l.y - l.fontSize - 4, w, h + 8);
        ctx.restore();
      }
    });
  }, [layers, selectedIdx]);

  useEffect(() => { redraw(); }, [redraw]);

  // NOTE: We intentionally do NOT preload the existing `value` URL into the canvas.
  // Loading a cross-origin image (localhost:5182 → localhost:5173) taints the canvas
  // and causes canvas.toBlob() to throw a SecurityError.
  // The current cover is shown as a preview BELOW the canvas instead.
  // When the user uploads a new image via file input, that blob: URL is safe and works fine.

  // ─── Mouse / Touch drag ───────────────────────────────────────────────────
  const getPt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  const onMouseDown = (e) => {
    const { x, y } = getPt(e);
    // Find clicked layer (reverse order — top layer first)
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      const ctx = canvasRef.current.getContext('2d');
      ctx.font = `${l.bold?'bold ':''}${l.italic?'italic ':''}${l.fontSize}px ${l.font}`;
      const w = Math.min(ctx.measureText(l.text).width + 20, CW - 20);
      const ox = l.align === 'center' ? l.x - w/2 : l.align === 'right' ? l.x - w : l.x;
      if (x >= ox && x <= ox + w && y >= l.y - l.fontSize - 4 && y <= l.y + l.fontSize) {
        setSelectedIdx(i);
        dragging.current = { idx: i, ox: x - l.x, oy: y - l.y };
        e.preventDefault();
        return;
      }
    }
    setSelectedIdx(null);
  };

  const onMouseMove = (e) => {
    if (!dragging.current) return;
    const { x, y } = getPt(e);
    const { idx, ox, oy } = dragging.current;
    setLayers(prev => prev.map((l, i) => i === idx ? { ...l, x: x - ox, y: y - oy } : l));
    e.preventDefault();
  };

  const onMouseUp = () => { dragging.current = null; };

  // ─── File upload ─────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { imgRef.current = img; setImgSrc(url); redraw(); };
    img.src = url;
  };

  // ─── Upload canvas as image ───────────────────────────────────────────────
  const handleSave = () => {
    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setUploading(true);
      const file = new File([blob], `cover_${Date.now()}.jpg`, { type: 'image/jpeg' });
      try {
        const res = await storiesAPI.uploadThumbnail(file);
        const url = res.data?.data?.url;
        if (url) { onChange(url); toast.success('Cover save ho gaya! 🎨'); }
      } catch { toast.error('Upload fail ho gaya.'); }
      finally { setUploading(false); }
    }, 'image/jpeg', 0.92);
  };

  // ─── Layer controls ───────────────────────────────────────────────────────
  const updateLayer = (key, val) => {
    if (selectedIdx === null) return;
    setLayers(prev => prev.map((l, i) => i === selectedIdx ? { ...l, [key]: val } : l));
  };

  const addLayer = () => {
    const newL = { text: 'Naya Text', x: CW/2, y: CH/3, fontSize: 28, color: '#ffffff', font: FONTS[0], align: 'center', bold: false, italic: false, shadow: true, opacity: 1 };
    setLayers(prev => [...prev, newL]);
    setSelectedIdx(layers.length);
  };

  const deleteLayer = () => {
    if (selectedIdx === null) return;
    setLayers(prev => prev.filter((_, i) => i !== selectedIdx));
    setSelectedIdx(null);
  };

  const sel = selectedIdx !== null ? layers[selectedIdx] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Current cover preview (read-only, from existing value) */}
      {value && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.7rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <img
            src={getMediaUrl(value)}
            alt="Current cover"
            style={{ width: '36px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>✅ Current Cover</p>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Naya editor se banao ya rakho jaisa hai</p>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{ width: '200px', height: '280px', borderRadius: '8px', border: '2px solid var(--border)', cursor: 'move', display: 'block', touchAction: 'none' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onMouseDown}
            onTouchMove={onMouseMove}
            onTouchEnd={onMouseUp}
          />
          <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
            Text drag karo mouse se
          </p>
        </div>

        {/* Controls panel */}
        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {/* Image upload */}
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>📸 Background Image</p>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => fileRef.current.click()}>
              🖼️ Image Upload Karo
            </button>
          </div>

          {/* Text layers */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>✍️ Text Layers</p>
              <button className="btn btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={addLayer}>+ Add</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '80px', overflowY: 'auto' }}>
              {layers.map((l, i) => (
                <div key={i} onClick={() => setSelectedIdx(i)} style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', background: selectedIdx === i ? 'rgba(220,20,60,0.12)' : 'var(--bg-secondary)', border: `1px solid ${selectedIdx === i ? 'rgba(220,20,60,0.4)' : 'var(--border)'}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.text || '(empty)'}
                </div>
              ))}
            </div>
          </div>

          {/* Selected layer editor */}
          {sel && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>🎨 Text Edit Karo</p>

              {/* Text content */}
              <textarea
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.4rem', resize: 'vertical', minHeight: '50px' }}
                value={sel.text}
                onChange={(e) => updateLayer('text', e.target.value)}
                placeholder="Text yahan likho..."
              />

              {/* Font size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>Size:</label>
                <input type="range" min={12} max={80} value={sel.fontSize} onChange={(e) => updateLayer('fontSize', +e.target.value)} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.7rem', minWidth: '24px' }}>{sel.fontSize}</span>
              </div>

              {/* Color */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>Color:</label>
                {COLORS.map(c => (
                  <div key={c} onClick={() => updateLayer('color', c)} style={{ width: '18px', height: '18px', borderRadius: '3px', background: c, border: sel.color === c ? '2px solid var(--red-primary)' : '1px solid var(--border)', cursor: 'pointer', flexShrink: 0 }} />
                ))}
                <input type="color" value={sel.color} onChange={(e) => updateLayer('color', e.target.value)} style={{ width: '24px', height: '24px', border: 'none', padding: 0, borderRadius: '3px', cursor: 'pointer' }} title="Custom color" />
              </div>

              {/* Font family */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>Font:</label>
                <select className="form-input" style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }} value={sel.font} onChange={(e) => updateLayer('font', e.target.value)}>
                  {FONTS.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                </select>
              </div>

              {/* Align */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>Align:</label>
                {ALIGNS.map(a => (
                  <button key={a} className={`btn btn-sm ${sel.align === a ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }} onClick={() => updateLayer('align', a)}>
                    {a === 'left' ? '◀' : a === 'center' ? '●' : '▶'}
                  </button>
                ))}
              </div>

              {/* Style toggles */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[['bold','B','bold'],['italic','I','italic'],['shadow','S','text-shadow'],['opacity','Opacity','opacity']].map(([key, label]) => (
                  key !== 'opacity' ? (
                    <button key={key} className={`btn btn-sm ${sel[key] ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', fontStyle: key === 'italic' ? 'italic' : 'normal', fontWeight: key === 'bold' ? '800' : '400' }} onClick={() => updateLayer(key, !sel[key])}>
                      {label}
                    </button>
                  ) : (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Opacity:</label>
                      <input type="range" min={0.1} max={1} step={0.05} value={sel.opacity ?? 1} onChange={(e) => updateLayer('opacity', +e.target.value)} style={{ flex: 1 }} />
                    </div>
                  )
                ))}
                <button className="btn btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: 'var(--red-primary)' }} onClick={deleteLayer}>🗑️</button>
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleSave}
            disabled={uploading}
          >
            {uploading ? '⏳ Uploading...' : '💾 Cover Save Karo'}
          </button>

          {value && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', wordBreak: 'break-all' }}>
              ✅ Saved: {value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
