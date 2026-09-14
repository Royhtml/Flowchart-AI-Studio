import React, { useEffect, useRef } from 'react';
import {
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Scaling,
  Sparkles,
  Maximize,
  Minimize,
  Workflow,
  CheckSquare,
} from 'lucide-react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface CanvasContextMenuProps {
  position: ContextMenuPosition;
  nodeId: string | null;
  nodeLabel?: string;
  onClose: () => void;
  // Node actions
  onBringToFront?: (nodeId: string) => void;
  onSendToBack?: (nodeId: string) => void;
  onBringForward?: (nodeId: string) => void;
  onSendBackward?: (nodeId: string) => void;
  onScaleNode?: (nodeId: string, factor: number) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onFitNodeText?: (nodeId: string) => void;
  // Canvas actions
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitDiagram?: () => void;
  onOpenLayers?: () => void;
  onOpenScaleModal?: () => void;
  onAutoArrange?: (direction: 'TB' | 'LR') => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  position,
  nodeId,
  nodeLabel,
  onClose,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onScaleNode,
  onDuplicateNode,
  onDeleteNode,
  onFitNodeText,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitDiagram,
  onOpenLayers,
  onOpenScaleModal,
  onAutoArrange,
  onSelectAll,
  onDeselectAll,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Prevent right-click inside the menu itself from re-opening
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Adjust position so it doesn't overflow screen
  const menuWidth = 220;
  const menuHeight = nodeId ? 380 : 250;
  const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      onContextMenu={handleContextMenu}
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
      className="fixed z-50 w-56 bg-slate-900/98 border border-slate-700/90 rounded-xl shadow-2xl backdrop-blur-xl p-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800/80"
    >
      {nodeId ? (
        <>
          {/* Node Header */}
          <div className="px-2.5 py-1.5 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
              Node Actions
            </span>
            <span className="text-xs font-medium text-slate-300 truncate block">
              {nodeLabel || 'Selected Element'}
            </span>
          </div>

          {/* Layer Arrangement (Urutan Lapisan) */}
          <div className="py-1">
            <span className="px-2.5 py-0.5 text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">
              Layer Order
            </span>
            <button
              onClick={() => {
                onBringToFront?.(nodeId);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <ChevronsUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Bring to Front</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Ctrl+Shift+]</span>
            </button>
            <button
              onClick={() => {
                onBringForward?.(nodeId);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                <span>Bring Forward</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Ctrl+]</span>
            </button>
            <button
              onClick={() => {
                onSendBackward?.(nodeId);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                <span>Send Backward</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Ctrl+[</span>
            </button>
            <button
              onClick={() => {
                onSendToBack?.(nodeId);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <ChevronsDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Send to Back</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Ctrl+Shift+[</span>
            </button>
          </div>

          {/* Scale & Resize (Perkecil / Perbesar) */}
          <div className="py-1">
            <span className="px-2.5 py-0.5 text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">
              Resize & Scale
            </span>
            <div className="grid grid-cols-2 gap-1 px-1.5 py-1">
              <button
                onClick={() => {
                  onScaleNode?.(nodeId, 1.2);
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-white transition-colors text-[11px]"
              >
                <Maximize className="w-3 h-3" />
                <span>+20%</span>
              </button>
              <button
                onClick={() => {
                  onScaleNode?.(nodeId, 0.8);
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-amber-300 hover:text-white transition-colors text-[11px]"
              >
                <Minimize className="w-3 h-3" />
                <span>-20%</span>
              </button>
            </div>
            {onFitNodeText && (
              <button
                onClick={() => {
                  onFitNodeText(nodeId);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Fit Size to Content</span>
              </button>
            )}
          </div>

          {/* Edit Actions */}
          <div className="py-1">
            <button
              onClick={() => {
                onDuplicateNode?.(nodeId);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Duplicate</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Ctrl+D</span>
            </button>
            <button
              onClick={() => {
                onDeleteNode?.(nodeId);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-rose-950/60 text-rose-300 hover:text-rose-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Del</span>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Canvas Header */}
          <div className="px-2.5 py-1.5 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
              Canvas View & Scale
            </span>
            <span className="text-xs font-medium text-slate-300 block">
              Diagram Controls
            </span>
          </div>

          {/* Canvas Zoom & View */}
          <div className="py-1">
            <button
              onClick={() => {
                onZoomIn?.();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Zoom In (Enlarge)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">+15%</span>
            </button>
            <button
              onClick={() => {
                onZoomOut?.();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <ZoomOut className="w-3.5 h-3.5 text-cyan-400" />
                <span>Zoom Out (Shrink)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">-15%</span>
            </button>
            <button
              onClick={() => {
                onResetZoom?.();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fit to Screen</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Reset</span>
            </button>
          </div>

          {/* Selection Actions (Section All) */}
          <div className="py-1">
            {onSelectAll && (
              <button
                onClick={() => {
                  onSelectAll();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select All Nodes</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Ctrl+A</span>
              </button>
            )}
            {onDeselectAll && (
              <button
                onClick={() => {
                  onDeselectAll();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 text-slate-400 flex items-center justify-center font-bold text-xs">✕</span>
                  <span>Deselect All</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Esc</span>
              </button>
            )}
          </div>

          {/* Diagram Tools */}
          <div className="py-1">
            {onAutoArrange && (
              <>
                <button
                  onClick={() => {
                    onAutoArrange('TB');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
                >
                  <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Auto-Arrange (Top → Down)</span>
                </button>
                <button
                  onClick={() => {
                    onAutoArrange('LR');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
                >
                  <Workflow className="w-3.5 h-3.5 text-indigo-400 rotate-[-90deg]" />
                  <span>Auto-Arrange (Left → Right)</span>
                </button>
              </>
            )}
            <button
              onClick={() => {
                onOpenLayers?.();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Layers & Z-Order Panel</span>
            </button>
            <button
              onClick={() => {
                onOpenScaleModal?.();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
            >
              <Scaling className="w-3.5 h-3.5 text-amber-400" />
              <span>Scale Entire Flowchart...</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
