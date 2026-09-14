import React, { useState, useRef, useEffect } from 'react';
import { FlowNode, PortPosition, ShapeType } from '../types';
import { Database, FileText, Cloud, Clock, StickyNote, Play, CheckCircle, Loader2 } from 'lucide-react';

interface CanvasNodeProps {
  node: FlowNode;
  isSelected: boolean;
  isConnectingSource: boolean;
  zoom: number;
  onSelect: (e: React.MouseEvent, node: FlowNode) => void;
  onStartDrag: (e: React.MouseEvent, node: FlowNode) => void;
  onStartConnect: (nodeId: string, port: PortPosition, e: React.MouseEvent) => void;
  onPortMouseUp: (nodeId: string, port: PortPosition) => void;
  onUpdateLabel: (nodeId: string, newLabel: string, newSubLabel?: string) => void;
  onStartResize?: (
    e: React.MouseEvent,
    node: FlowNode,
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  ) => void;
  onContextMenu?: (e: React.MouseEvent, node: FlowNode) => void;
  isNewlyGenerated?: boolean;
  generationIndex?: number;
}

export const CanvasNode: React.FC<CanvasNodeProps> = ({
  node,
  isSelected,
  isConnectingSource,
  zoom,
  onSelect,
  onStartDrag,
  onStartConnect,
  onPortMouseUp,
  onUpdateLabel,
  onStartResize,
  onContextMenu,
  isNewlyGenerated,
  generationIndex = 0,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(node.label);
  const [editSubLabel, setEditSubLabel] = useState(node.subLabel || '');
  const [isHovered, setIsHovered] = useState(false);
  // Mode Ubah Ukuran: Hanya aktif jika node di-klik 2 kali (double click)
  const [isResizeMode, setIsResizeMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditLabel(node.label);
    setEditSubLabel(node.subLabel || '');
  }, [node.label, node.subLabel]);

  // Keluar dari mode ubah ukuran saat node tidak lagi dipilih
  useEffect(() => {
    if (!isSelected) {
      setIsResizeMode(false);
    }
  }, [isSelected]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Klik 2 kali: masuk mode perbesar / perkecil ukuran flowchart
    setIsResizeMode(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onUpdateLabel(node.id, editLabel.trim() || 'Node', editSubLabel.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditLabel(node.label);
      setEditSubLabel(node.subLabel || '');
      setIsEditing(false);
    }
  };

  // Determine glow class
  let glowEffect = '';
  if (node.executionState === 'running') {
    glowEffect = 'ring-4 ring-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.8)] scale-[1.02]';
  } else if (node.executionState === 'completed') {
    glowEffect = 'ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
  } else if (node.executionState === 'failed') {
    glowEffect = 'ring-4 ring-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.8)] animate-pulse';
  } else if (isSelected) {
    glowEffect = 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
  } else if (node.shadow === 'glow-cyan') {
    glowEffect = 'shadow-[0_0_18px_rgba(6,182,212,0.35)]';
  } else if (node.shadow === 'glow-emerald') {
    glowEffect = 'shadow-[0_0_18px_rgba(16,185,129,0.35)]';
  } else if (node.shadow === 'glow-violet') {
    glowEffect = 'shadow-[0_0_18px_rgba(168,85,247,0.35)]';
  } else if (node.shadow === 'glow-amber') {
    glowEffect = 'shadow-[0_0_18px_rgba(245,158,11,0.35)]';
  }

  // Render Port Anchor - Port koneksi: klik & tahan lalu seret ke node lain
  const renderPort = (position: PortPosition) => {
    const portPosStyle: Record<PortPosition, string> = {
      top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
      right: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2',
      bottom: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
      left: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2',
    };

    // Port selalu tampil saat node terpilih ATAU saat hovering ATAU saat sedang menghubungkan
    const showPorts = isHovered || isSelected || isConnectingSource;

    return (
      <div
        key={position}
        data-port="true"
        data-node-port={`${node.id}-${position}`}
        className={`absolute z-50 ${portPosStyle[position]} transition-all duration-150 ${
          showPorts ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
        }`}
        // Padding invisible untuk memperbesar area klik port
        style={{ 
          padding: '8px', 
          margin: '-8px',
          cursor: 'crosshair',
          pointerEvents: showPorts ? 'auto' : 'none'
        }}
        onMouseDown={(e) => {
          // PENTING: Hentikan propagasi agar node body tidak mulai drag
          e.stopPropagation();
          e.preventDefault();
          onStartConnect(node.id, position, e);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onPortMouseUp(node.id, position);
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <div
          className={`w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 hover:scale-150 hover:bg-cyan-300 hover:ring-2 hover:ring-cyan-200 cursor-crosshair transition-all shadow-[0_0_8px_rgba(6,182,212,0.6)] ${
            isSelected && !isResizeMode
              ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950 scale-125 shadow-[0_0_14px_rgba(6,182,212,0.9)]'
              : ''
          }`}
          style={{ pointerEvents: 'none' }}
        />
      </div>
    );
  };

  // Render Shape SVG Background
  const renderShapeSvg = () => {
    const w = node.width;
    const h = node.height;
    const strokeDash =
      node.strokeStyle === 'dashed' ? '5,4' : 'none';

    switch (node.type) {
      case 'terminator':
      case 'start-end':
        return (
          <rect
            x="2"
            y="2"
            width={w - 4}
            height={h - 4}
            rx={(h - 4) / 2}
            ry={(h - 4) / 2}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );

      case 'decision':
        return (
          <polygon
            points={`${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );

      case 'input-output': {
        const slant = 18;
        return (
          <polygon
            points={`${slant},2 ${w - 2},2 ${w - slant - 2},${h - 2} 2,${h - 2}`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'database': {
        const rh = 12;
        return (
          <g>
            {/* Cylinder body */}
            <path
              d={`M 2,${rh} L 2,${h - rh} A ${w / 2 - 2} ${rh} 0 0 0 ${w - 2} ${h - rh} L ${w - 2},${rh} Z`}
              fill={node.fillColor}
              stroke={node.strokeColor}
              strokeWidth={node.strokeWidth}
              strokeDasharray={strokeDash}
            />
            {/* Cylinder top lid */}
            <ellipse
              cx={w / 2}
              cy={rh}
              rx={w / 2 - 2}
              ry={rh - 2}
              fill={node.fillColor}
              stroke={node.strokeColor}
              strokeWidth={node.strokeWidth}
            />
          </g>
        );
      }

      case 'document': {
        const wave = 10;
        return (
          <path
            d={`M 2,2 L ${w - 2},2 L ${w - 2},${h - wave} Q ${w * 0.75} ${h + 2}, ${w / 2} ${h - wave} T 2,${h - wave} Z`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'multidocument': {
        const wave = 8;
        return (
          <g>
            {/* Layer 3 back */}
            <path
              d={`M 8,2 L ${w - 2},2 L ${w - 2},${h - wave - 8} Q ${w * 0.75} ${h - 6}, ${w / 2} ${h - wave - 8} T 8,${h - wave - 8} Z`}
              fill={node.fillColor}
              stroke={node.strokeColor}
              strokeWidth={1.5}
              opacity="0.4"
            />
            {/* Layer 2 middle */}
            <path
              d={`M 5,5 L ${w - 5},5 L ${w - 5},${h - wave - 4} Q ${w * 0.75} ${h - 2}, ${w / 2} ${h - wave - 4} T 5,${h - wave - 4} Z`}
              fill={node.fillColor}
              stroke={node.strokeColor}
              strokeWidth={1.5}
              opacity="0.7"
            />
            {/* Layer 1 front */}
            <path
              d={`M 2,8 L ${w - 8},8 L ${w - 8},${h - wave} Q ${(w - 8) * 0.75} ${h + 4}, ${(w - 8) / 2} ${h - wave} T 2,${h - wave} Z`}
              fill={node.fillColor}
              stroke={node.strokeColor}
              strokeWidth={node.strokeWidth}
              strokeDasharray={strokeDash}
            />
          </g>
        );
      }

      case 'predefined-process':
      case 'subprocess': {
        const stripeOffset = 16;
        return (
          <g>
            <rect
              x="2"
              y="2"
              width={w - 4}
              height={h - 4}
              rx={node.rounded || 6}
              fill={node.fillColor}
              stroke={node.strokeColor}
              strokeWidth={node.strokeWidth}
              strokeDasharray={strokeDash}
            />
            <line
              x1={stripeOffset}
              y1="2"
              x2={stripeOffset}
              y2={h - 2}
              stroke={node.strokeColor}
              strokeWidth={node.strokeWidth}
            />
            <line
              x1={w - stripeOffset}
              y1="2"
              x2={w - stripeOffset}
              y2={h - 2}
              stroke={node.strokeColor}
              strokeWidth={node.strokeWidth}
            />
          </g>
        );
      }

      case 'connector': {
        // On-page connector: circular shape
        const r = Math.min(w, h) / 2 - 2;
        return (
          <circle
            cx={w / 2}
            cy={h / 2}
            r={r}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'offpage-connector': {
        // Off-page connector: pentagon pointing down (home plate upside down)
        const cutY = h - 18;
        return (
          <polygon
            points={`2,2 ${w - 2},2 ${w - 2},${cutY} ${w / 2},${h - 2} 2,${cutY}`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'manual-input': {
        // Manual input: trapezoid with top slanting down from left to right
        const topSlant = 14;
        return (
          <polygon
            points={`2,${topSlant} ${w - 2},2 ${w - 2},${h - 2} 2,${h - 2}`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'manual-operation': {
        // Manual operation: inverted trapezoid (wide top, narrow bottom)
        const inset = 18;
        return (
          <polygon
            points={`2,2 ${w - 2},2 ${w - inset},${h - 2} ${inset},${h - 2}`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'preparation': {
        // Preparation: Hexagon with pointed left and right
        const pointW = 20;
        return (
          <polygon
            points={`2,${h / 2} ${pointW},2 ${w - pointW},2 ${w - 2},${h / 2} ${w - pointW},${h - 2} ${pointW},${h - 2}`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'delay': {
        // Delay: D-shape (straight left, rounded right)
        const r = (h - 4) / 2;
        return (
          <path
            d={`M 2,2 L ${w - r - 2},2 A ${r} ${r} 0 0 1 ${w - r - 2},${h - 2} L 2,${h - 2} Z`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'display': {
        // Display: Screen with rounded right end and pointed/notched left
        return (
          <path
            d={`M 16,2 L ${w - 18},2 Q ${w + 4} ${h / 2}, ${w - 18} ${h - 2} L 16,${h - 2} L 2,${h / 2} Z`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'cloud':
        return (
          <rect
            x="2"
            y="2"
            width={w - 4}
            height={h - 4}
            rx={18}
            ry={18}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );

      case 'note': {
        const fold = 14;
        return (
          <g>
            <polygon
              points={`2,2 ${w - fold},2 ${w - 2},${fold} ${w - 2},${h - 2} 2,${h - 2}`}
              fill={node.fillColor}
              stroke={node.strokeColor}
              strokeWidth={node.strokeWidth}
              strokeDasharray={strokeDash}
            />
            <polygon
              points={`${w - fold},2 ${w - fold},${fold} ${w - 2},${fold}`}
              fill={node.strokeColor}
              opacity="0.5"
            />
          </g>
        );
      }

      case 'hexagon': {
        const inset = Math.min(24, Math.round(w * 0.16));
        return (
          <polygon
            points={`${inset},2 ${w - inset},2 ${w - 2},${h / 2} ${w - inset},${h - 2} ${inset},${h - 2} 2,${h / 2}`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'shield': {
        const d = `M 2,8 Q ${w / 2},0 ${w - 2},8 L ${w - 2},${h * 0.58} Q ${w - 2},${h - 2} ${w / 2},${h - 2} Q 2,${h - 2} 2,${h * 0.58} Z`;
        return (
          <path
            d={d}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'star': {
        const cx = w / 2;
        const cy = h / 2;
        const outerR = Math.min(w, h) / 2 - 2;
        const innerR = outerR * 0.48;
        const pts: string[] = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return (
          <polygon
            points={pts.join(' ')}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'triangle':
        return (
          <polygon
            points={`${w / 2},3 ${w - 3},${h - 3} 3,${h - 3}`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );

      case 'cylinder': {
        const rh = Math.min(16, h * 0.2);
        return (
          <g>
            <path
              d={`M 2,${rh} L 2,${h - rh} A ${w / 2 - 2} ${rh} 0 0 0 ${w - 2} ${h - rh} L ${w - 2},${rh} Z`}
              fill={node.fillColor}
              stroke={node.strokeColor}
              strokeWidth={node.strokeWidth}
              strokeDasharray={strokeDash}
            />
            <ellipse
              cx={w / 2}
              cy={rh}
              rx={w / 2 - 2}
              ry={rh - 2}
              fill={node.fillColor}
              stroke={node.strokeColor}
              strokeWidth={node.strokeWidth}
            />
          </g>
        );
      }

      case 'callout': {
        const tailW = 14;
        const tailH = 10;
        return (
          <path
            d={`M 8,2 L ${w - 8},2 Q ${w - 2},2 ${w - 2},8 L ${w - 2},${h - tailH - 8} Q ${w - 2},${h - tailH} ${w - 8},${h - tailH} L ${w / 2 + tailW},${h - tailH} L ${w / 2},${h - 2} L ${w / 2 - tailW},${h - tailH} L 8,${h - tailH} Q 2,${h - tailH} 2,${h - tailH - 8} L 2,8 Q 2,2 8,2 Z`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'badge': {
        const notch = 12;
        return (
          <polygon
            points={`2,2 ${w - 2},2 ${w - notch},${h / 2} ${w - 2},${h - 2} 2,${h - 2} ${notch},${h / 2}`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'cloud-service': {
        return (
          <path
            d={`M 14,${h - 8} A 10,10 0 0,1 18,${h * 0.4} A 18,18 0 0,1 ${w * 0.45},10 A 18,18 0 0,1 ${w - 18},${h * 0.35} A 12,12 0 0,1 ${w - 8},${h - 8} Z`}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'custom': {
        if (node.customSvgPath) {
          return (
            <path
              d={node.customSvgPath}
              fill={node.fillColor}
              stroke={node.strokeColor}
              strokeWidth={node.strokeWidth}
              strokeDasharray={strokeDash}
            />
          );
        }
        return (
          <rect
            x="2"
            y="2"
            width={w - 4}
            height={h - 4}
            rx={node.rounded || 8}
            ry={node.rounded || 8}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
      }

      case 'process':
      default:
        return (
          <rect
            x="2"
            y="2"
            width={w - 4}
            height={h - 4}
            rx={node.rounded || 8}
            ry={node.rounded || 8}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={node.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );
    }
  };

  const entranceAnimClass = isNewlyGenerated
    ? 'animate-in zoom-in-50 fade-in slide-in-from-bottom-8 duration-700 ring-2 ring-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.7)]'
    : '';

  return (
    <div
      id={`node-${node.id}`}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: `${node.width}px`,
        height: `${node.height}px`,
        animationDelay: isNewlyGenerated ? `${Math.min(generationIndex * 70, 700)}ms` : undefined,
        animationFillMode: 'both',
      }}
      className={`absolute cursor-move select-none transition-shadow duration-200 group rounded-lg ${glowEffect} ${entranceAnimClass}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e, node);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, node);
      }}
      onMouseDown={(e) => {
        const tgt = e.target as HTMLElement;
        
        // PENTING: Jangan mulai drag jika klik berasal dari:
        // 1. Port koneksi (bulatan biru untuk koneksi)
        // 2. Handle resize (kotak putih untuk mengubah ukuran)
        // 3. Input field untuk edit teks
        const isPortClick = tgt.closest('[data-port="true"]') !== null;
        const isResizeHandle = tgt.closest('[data-resize-handle]') !== null || 
                               tgt.classList.contains('cursor-nwse-resize') ||
                               tgt.classList.contains('cursor-nesw-resize') ||
                               tgt.classList.contains('cursor-ns-resize') ||
                               tgt.classList.contains('cursor-ew-resize');
        const isInput = tgt.tagName.toLowerCase() === 'input';
        
        // Hanya mulai drag jika BUKAN klik pada port, handle resize, atau input
        if (!isPortClick && !isResizeHandle && !isInput) {
          onStartDrag(e, node);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
    >
      {/* SVG Shape Graphic */}
      <svg
        className="w-full h-full absolute inset-0 pointer-events-none overflow-visible"
        viewBox={`0 0 ${node.width} ${node.height}`}
      >
        {renderShapeSvg()}
      </svg>

      {/* 8-Point Draw.io Style Interactive Resize Handles - Baru muncul saat di-klik 2 kali */}
      {isSelected && isResizeMode && onStartResize && (
        <div className="absolute -inset-[3px] pointer-events-none z-30 border-2 border-dashed border-cyan-400/90 rounded-md animate-in fade-in zoom-in-95 duration-150 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          {/* Dimension Badge */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-cyan-950/95 border border-cyan-500/60 text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Resize: {Math.round(node.width)} × {Math.round(node.height)}px</span>
          </div>
          {/* NW - Top Left */}
          <div
            data-resize-handle="nw"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize(e, node, 'nw');
            }}
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs shadow-md cursor-nwse-resize pointer-events-auto hover:bg-cyan-300 hover:scale-125 transition-transform"
            title="Resize Top-Left (NW)"
          />
          {/* N - Top Center */}
          <div
            data-resize-handle="n"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize(e, node, 'n');
            }}
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs shadow-md cursor-ns-resize pointer-events-auto hover:bg-cyan-300 hover:scale-125 transition-transform"
            title="Resize Height (Top)"
          />
          {/* NE - Top Right */}
          <div
            data-resize-handle="ne"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize(e, node, 'ne');
            }}
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs shadow-md cursor-nesw-resize pointer-events-auto hover:bg-cyan-300 hover:scale-125 transition-transform"
            title="Resize Top-Right (NE)"
          />
          {/* E - Right Center */}
          <div
            data-resize-handle="e"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize(e, node, 'e');
            }}
            className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs shadow-md cursor-ew-resize pointer-events-auto hover:bg-cyan-300 hover:scale-125 transition-transform"
            title="Resize Width (Right)"
          />
          {/* SE - Bottom Right */}
          <div
            data-resize-handle="se"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize(e, node, 'se');
            }}
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs shadow-md cursor-nwse-resize pointer-events-auto hover:bg-cyan-300 hover:scale-125 transition-transform"
            title="Resize Bottom-Right (SE)"
          />
          {/* S - Bottom Center */}
          <div
            data-resize-handle="s"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize(e, node, 's');
            }}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs shadow-md cursor-ns-resize pointer-events-auto hover:bg-cyan-300 hover:scale-125 transition-transform"
            title="Resize Height (Bottom)"
          />
          {/* SW - Bottom Left */}
          <div
            data-resize-handle="sw"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize(e, node, 'sw');
            }}
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs shadow-md cursor-nesw-resize pointer-events-auto hover:bg-cyan-300 hover:scale-125 transition-transform"
            title="Resize Bottom-Left (SW)"
          />
          {/* W - Left Center */}
          <div
            data-resize-handle="w"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize(e, node, 'w');
            }}
            className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-xs shadow-md cursor-ew-resize pointer-events-auto hover:bg-cyan-300 hover:scale-125 transition-transform"
            title="Resize Width (Left)"
          />
        </div>
      )}

      {/* Execution status floating badge */}
      {node.executionState && node.executionState !== 'idle' && (
        <div className="absolute -top-3 -right-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg border backdrop-blur-md">
          {node.executionState === 'running' && (
            <span className="flex items-center gap-1 text-cyan-300 bg-cyan-950/90 border-cyan-500/50">
              <Loader2 className="w-3 h-3 animate-spin" /> RUNNING
            </span>
          )}
          {node.executionState === 'completed' && (
            <span className="flex items-center gap-1 text-emerald-300 bg-emerald-950/90 border-emerald-500/50">
              <CheckCircle className="w-3 h-3" /> SUCCESS
            </span>
          )}
          {node.executionState === 'failed' && (
            <span className="flex items-center gap-1 text-rose-300 bg-rose-950/90 border-rose-500/50">
              FAILED
            </span>
          )}
        </div>
      )}

      {/* Node Content / Text */}
      <div
        className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4 py-2 pointer-events-auto"
        style={{
          color: node.textColor,
          textAlign: node.textAlign,
        }}
      >
        {isEditing ? (
          <div className="w-full flex flex-col gap-1 z-30">
            <input
              ref={inputRef}
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-900/95 text-white text-xs px-2 py-1 rounded border border-cyan-500 outline-none font-semibold text-center shadow-lg"
              placeholder="Title..."
            />
            <input
              type="text"
              value={editSubLabel}
              onChange={(e) => setEditSubLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-900/90 text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-slate-700 outline-none text-center"
              placeholder="Description..."
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center max-w-full">
            {node.customIcon && (
              <span className="text-sm select-none mb-0.5 leading-none">{node.customIcon}</span>
            )}
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title="Klik 2x teks untuk mengedit teks"
              className="truncate max-w-full leading-tight select-none cursor-pointer hover:underline decoration-cyan-400/50"
              style={{
                fontSize: `${node.fontSize}px`,
                fontWeight: node.fontWeight === 'bold' ? 700 : node.fontWeight === 'medium' ? 500 : 400,
              }}
            >
              {node.label}
            </span>
            {node.subLabel && (
              <span className="text-[10px] opacity-75 truncate max-w-full mt-0.5 leading-snug">
                {node.subLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4 Connection Ports */}
      {renderPort('top')}
      {renderPort('right')}
      {renderPort('bottom')}
      {renderPort('left')}
    </div>
  );
};
