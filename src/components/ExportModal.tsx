import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Image as ImageIcon, FileText, File, GripHorizontal } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onExport: (format: 'png' | 'jpg' | 'pdf' | 'svg', transparent: boolean, canvasBounds: boolean) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  onExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpg' | 'pdf' | 'svg'>('png');
  const [transparent, setTransparent] = useState(false);
  const [canvasBounds, setCanvasBounds] = useState(true);

  // --- Drag logic ---
  const modalRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  // Set initial centered position after first render
  useEffect(() => {
    if (isOpen && position === null && modalRef.current) {
      const w = modalRef.current.offsetWidth || 450;
      setPosition({ x: Math.max(8, (window.innerWidth - w) / 2), y: 100 });
    }
  }, [isOpen, position]);

  const handleDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('input')) return;
    if ((e.target as HTMLElement).closest('label')) return;
    if (!modalRef.current) return;
    e.preventDefault();
    const rect = modalRef.current.getBoundingClientRect();
    dragOrigin.current = { mx: e.clientX, my: e.clientY, bx: rect.left, by: rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current || !modalRef.current) return;
    const dx = e.clientX - dragOrigin.current.mx;
    const dy = e.clientY - dragOrigin.current.my;
    const newX = dragOrigin.current.bx + dx;
    const newY = dragOrigin.current.by + dy;
    const maxX = window.innerWidth - modalRef.current.offsetWidth - 8;
    const maxY = window.innerHeight - 60;
    setPosition({ x: Math.max(8, Math.min(newX, maxX)), y: Math.max(8, Math.min(newY, maxY)) });
  }, []);

  const handleDragEnd = useCallback(() => { dragOrigin.current = null; }, []);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(selectedFormat, transparent, canvasBounds);
    onClose();
  };

  const posStyle: React.CSSProperties = position !== null
    ? { position: 'fixed', left: position.x, top: position.y, transform: 'none' }
    : { position: 'fixed', top: 100, left: '50%', transform: 'translateX(-50%)' };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
      <div
        ref={modalRef}
        style={posStyle}
        className="w-full max-w-md pointer-events-auto animate-in zoom-in-95 slide-in-from-top-4"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
          {/* Draggable Header */}
          <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between cursor-grab active:cursor-grabbing select-none">
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-4 h-4 text-slate-500" />
              <Download className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-slate-100">Export Flowchart</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* File Name Preview */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">File Name</label>
              <div className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono">
                {projectName.toLowerCase().replace(/\s+/g, '-')}.{selectedFormat}
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Export Format</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { format: 'png' as const, icon: ImageIcon, label: 'PNG', desc: 'High quality' },
                  { format: 'jpg' as const, icon: ImageIcon, label: 'JPG', desc: 'Smaller size' },
                  { format: 'pdf' as const, icon: FileText, label: 'PDF', desc: 'Document' },
                  { format: 'svg' as const, icon: File, label: 'SVG', desc: 'Vector' },
                ].map((item) => (
                  <button
                    key={item.format}
                    onClick={() => setSelectedFormat(item.format)}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      selectedFormat === item.format
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500/30'
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] opacity-75">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">Export Options</label>
              
              <label className="flex items-center gap-2.5 p-3 bg-slate-950 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="checkbox"
                  checked={canvasBounds}
                  onChange={(e) => setCanvasBounds(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200">Fit to Canvas Paper</div>
                  <div className="text-xs text-slate-500">Export sesuai ukuran kertas canvas</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 bg-slate-950 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(e) => setTransparent(e.target.checked)}
                  disabled={selectedFormat === 'jpg'}
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 disabled:opacity-50"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200">Transparent Background</div>
                  <div className="text-xs text-slate-500">
                    {selectedFormat === 'jpg' ? 'Not available for JPG' : 'Remove background color'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-900/40 active:scale-95"
            >
              <Download className="w-4 h-4" />
              Download {selectedFormat.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
