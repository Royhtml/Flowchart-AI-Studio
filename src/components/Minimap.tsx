import React, { useState, useRef } from 'react';
import { FlowNode, FlowConnector, CanvasState } from '../types';
import { getDiagramBounds } from '../utils/geometry';
import { Map, ChevronDown, ChevronUp, X, GripVertical } from 'lucide-react';

interface MinimapProps {
  nodes: FlowNode[];
  connectors: FlowConnector[];
  canvasState: CanvasState;
  viewportSize: { width: number; height: number };
  onNavigate: (x: number, y: number) => void;
  onClose?: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  connectors,
  canvasState,
  viewportSize,
  onNavigate,
  onClose,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // Position state for dragging the Overview modal freely
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  // Collapse by default on narrow screens (< 768px) to keep canvas spacious
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const mapWidth = 180;
  const mapHeight = 115;

  const bounds = getDiagramBounds(nodes);
  const padding = 120;
  const totalW = Math.max(bounds.width + padding * 2, 1200);
  const totalH = Math.max(bounds.height + padding * 2, 800);

  const scaleX = mapWidth / totalW;
  const scaleY = mapHeight / totalH;
  const mapScale = Math.min(scaleX, scaleY);

  // Viewport rect calculation in minimap scale
  const vpX = (-canvasState.pan.x / canvasState.zoom - (bounds.minX - padding)) * mapScale;
  const vpY = (-canvasState.pan.y / canvasState.zoom - (bounds.minY - padding)) * mapScale;
  const vpW = (viewportSize.width / canvasState.zoom) * mapScale;
  const vpH = (viewportSize.height / canvasState.zoom) * mapScale;

  // Dragging the Overview window by its header
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.stopPropagation();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    let initialX = panelPos?.x;
    let initialY = panelPos?.y;

    if (initialX === undefined || initialY === undefined) {
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const parentRect = panelRef.current.parentElement?.getBoundingClientRect();
        if (parentRect) {
          initialX = rect.left - parentRect.left;
          initialY = rect.top - parentRect.top;
        } else {
          initialX = rect.left;
          initialY = rect.top;
        }
      } else {
        initialX = 100;
        initialY = 20;
      }
    }

    setIsDraggingPanel(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;

      const parentWidth = panelRef.current?.parentElement?.clientWidth || window.innerWidth;
      const parentHeight = panelRef.current?.parentElement?.clientHeight || window.innerHeight;
      const currentWidth = panelRef.current?.offsetWidth || 184;
      const currentHeight = panelRef.current?.offsetHeight || 150;

      const newX = Math.max(8, Math.min(parentWidth - currentWidth - 8, initialX! + dx));
      const newY = Math.max(8, Math.min(parentHeight - currentHeight - 8, initialY! + dy));

      setPanelPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDraggingPanel(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Navigating and dragging inside the minimap canvas
  const navigateFromMinimap = (clientX: number, clientY: number, mapRect: DOMRect) => {
    const clickX = clientX - mapRect.left;
    const clickY = clientY - mapRect.top;

    const targetCanvasX = (clickX / mapScale) + (bounds.minX - padding);
    const targetCanvasY = (clickY / mapScale) + (bounds.minY - padding);

    const newPanX = -(targetCanvasX - viewportSize.width / (2 * canvasState.zoom)) * canvasState.zoom;
    const newPanY = -(targetCanvasY - viewportSize.height / (2 * canvasState.zoom)) * canvasState.zoom;

    onNavigate(newPanX, newPanY);
  };

  const handleMapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const mapElement = e.currentTarget;
    const mapRect = mapElement.getBoundingClientRect();
    navigateFromMinimap(e.clientX, e.clientY, mapRect);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      navigateFromMinimap(moveEvent.clientX, moveEvent.clientY, mapRect);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // If collapsed, display a sleek compact badge pinned safely
  if (isCollapsed) {
    return (
      <div
        ref={panelRef}
        className="absolute z-20 select-none"
        style={
          panelPos
            ? { left: `${panelPos.x}px`, top: `${panelPos.y}px` }
            : { top: '12px', right: '16px' }
        }
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/50 rounded-lg shadow-xl backdrop-blur-md text-[11px] sm:text-xs font-semibold transition-all group"
          title="Open Overview Minimap"
        >
          <Map className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>Overview</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      id="flowchart-minimap"
      className={`absolute w-[150px] sm:w-[184px] bg-slate-900/95 border border-slate-700/90 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden select-none z-20 transition-shadow ${
        isDraggingPanel ? 'border-cyan-500 ring-2 ring-cyan-500/30 cursor-grabbing' : 'hover:border-cyan-500/50'
      } flex flex-col`}
      style={
        panelPos
          ? { left: `${panelPos.x}px`, top: `${panelPos.y}px` }
          : { top: '12px', right: '16px' }
      }
    >
      {/* Header bar - Draggable Handle */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className={`flex items-center justify-between px-2 sm:px-2.5 py-1 sm:py-1.5 bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-300 ${
          isDraggingPanel ? 'cursor-grabbing bg-slate-900' : 'cursor-grab hover:bg-slate-900/90'
        }`}
        title="Drag header to reposition Overview anywhere"
      >
        <div className="flex items-center gap-1 text-slate-300 pointer-events-none">
          <GripVertical className="w-3 h-3 text-slate-500" />
          <Map className="w-3 h-3 text-cyan-400" />
          <span className="uppercase tracking-wider text-[9px] sm:text-[10px]">Overview</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(true);
            }}
            className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Collapse Overview"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-300 transition-colors"
              title="Close Overview"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Map - Draggable viewport navigation */}
      <div
        className="relative w-full h-[95px] sm:h-[115px] bg-[#090d16] cursor-crosshair"
        onMouseDown={handleMapMouseDown}
        title="Click or drag anywhere to navigate canvas"
      >
        <svg className="w-full h-full pointer-events-none" viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
          <g transform={`scale(${mapScale}) translate(${-(bounds.minX - padding)}, ${-(bounds.minY - padding)})`}>
            {/* Connectors thumbnail */}
            {connectors.map((c) => {
              const from = nodes.find((n) => n.id === c.fromNodeId);
              const to = nodes.find((n) => n.id === c.toNodeId);
              if (!from || !to) return null;
              return (
                <line
                  key={c.id}
                  x1={from.x + from.width / 2}
                  y1={from.y + from.height / 2}
                  x2={to.x + to.width / 2}
                  y2={to.y + to.height / 2}
                  stroke={c.strokeColor || '#475569'}
                  strokeWidth="2.5"
                  opacity="0.8"
                />
              );
            })}

            {/* Nodes thumbnail */}
            {nodes.map((n) => (
              <rect
                key={n.id}
                x={n.x}
                y={n.y}
                width={n.width}
                height={n.height}
                fill={n.strokeColor || '#38bdf8'}
                opacity="0.75"
                rx="4"
              />
            ))}
          </g>
        </svg>

        {/* Viewport indicator box */}
        <div
          className="absolute border-2 border-cyan-400 bg-cyan-400/25 pointer-events-none rounded transition-all shadow-[0_0_8px_rgba(34,211,238,0.4)]"
          style={{
            left: `${Math.max(0, Math.min(mapWidth - 14, vpX))}px`,
            top: `${Math.max(0, Math.min(mapHeight - 10, vpY))}px`,
            width: `${Math.min(mapWidth, Math.max(16, vpW))}px`,
            height: `${Math.min(mapHeight, Math.max(12, vpH))}px`,
          }}
        />
      </div>
    </div>
  );
};
