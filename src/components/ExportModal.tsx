import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Image as ImageIcon,
  FileText,
  FileCode,
  Copy,
  Check,
  Sparkles,
  Maximize2,
  Eye,
  Loader2,
} from 'lucide-react';
import { FlowNode, FlowConnector } from '../types';
import { renderDiagramToCanvas, copyFlowchartToClipboard } from '../utils/export';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  nodes: FlowNode[];
  connectors: FlowConnector[];
  onExport: (format: 'png' | 'jpg' | 'pdf' | 'svg', transparent: boolean, canvasBounds: boolean) => Promise<void> | void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  nodes,
  connectors,
  onExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpg' | 'pdf' | 'svg'>('png');
  const [transparent, setTransparent] = useState(false);
  const [canvasBounds, setCanvasBounds] = useState(true);
  const [fileNameInput, setFileNameInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [exportStats, setExportStats] = useState({ width: 1200, height: 800 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync file name input when modal opens or project name changes
  useEffect(() => {
    if (isOpen) {
      const cleanName = (projectName || 'flowchart')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-');
      setFileNameInput(cleanName);
      setCopiedSuccess(false);
      setIsExporting(false);
    }
  }, [isOpen, projectName]);

  // Render diagram onto preview canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    try {
      const result = renderDiagramToCanvas(canvasRef.current, nodes, connectors, {
        transparentBg: transparent && selectedFormat !== 'jpg',
        scale: 1.5,
        padding: 40,
        showGrid: true,
      });

      if (result) {
        setExportStats({
          width: Math.round(result.exportWidth * 2),
          height: Math.round(result.exportHeight * 2),
        });
      }
    } catch (err) {
      console.warn('Failed to render canvas preview:', err);
    }
  }, [isOpen, nodes, connectors, transparent, selectedFormat]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat, transparent && selectedFormat !== 'jpg', canvasBounds);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
    }
  };

  const handleCopyClipboard = async () => {
    const success = await copyFlowchartToClipboard(nodes, connectors, {
      transparentBg: transparent,
      scale: 2,
    });
    if (success) {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2200);
    }
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="export-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/10"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 id="export-modal-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Export & Download Flowchart</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Live Canvas Preview
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Preview visual diagram sebelum diunduh dalam format gambar, dokumen, atau vektor.
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Tutup dialog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Two Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left / Top Column: Live Canvas Preview */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pratinjau Canvas (Live Preview)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                  {exportStats.width} × {exportStats.height} px (HD 2x)
                </span>
              </div>
            </div>

            {/* Canvas Preview Container Frame */}
            <div
              className={`relative rounded-xl border border-slate-700/80 overflow-hidden flex items-center justify-center min-h-[260px] sm:min-h-[340px] max-h-[380px] p-3 transition-colors ${
                transparent && selectedFormat !== 'jpg'
                  ? 'bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:12px_12px] bg-slate-950/90'
                  : 'bg-[#090d16]'
              }`}
            >
              {/* Actual Live Canvas Element */}
              <canvas
                id="export-preview-canvas"
                ref={canvasRef}
                className="max-h-[310px] sm:max-h-[340px] max-w-full object-contain rounded-lg shadow-lg"
              />

              {/* Empty Canvas Notice */}
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-4 text-center">
                  <Maximize2 className="w-8 h-8 text-slate-500 mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-slate-300">Canvas Masih Kosong</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Tambahkan beberapa node atau muat template sebelum melakukan export.
                  </p>
                </div>
              )}

              {/* Floating Quick Action: Copy to Clipboard */}
              {nodes.length > 0 && selectedFormat === 'png' && (
                <button
                  onClick={handleCopyClipboard}
                  className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-md backdrop-blur-md ${
                    copiedSuccess
                      ? 'bg-emerald-600 text-white shadow-emerald-900/40'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600/80'
                  }`}
                  title="Salin gambar PNG langsung ke Clipboard"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Salin PNG</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Diagram Summary Footnote */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>{nodes.length} Node komponen • {connectors.length} Konektor relasi</span>
              <span className="text-slate-500">Auto-crop & centering diagram aktif</span>
            </div>
          </div>

          {/* Right Column: Export Settings & Download Action */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* File Name Field */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Nama Berkas Unduhan
                </label>
                <div className="relative">
                  <input
                    id="input-export-filename"
                    type="text"
                    value={fileNameInput}
                    onChange={(e) => setFileNameInput(e.target.value)}
                    placeholder="nama-flowchart"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 pr-16"
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono font-bold text-cyan-400">
                    .{selectedFormat}
                  </span>
                </div>
              </div>

              {/* Format Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Pilih Format Berkas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      format: 'png' as const,
                      icon: ImageIcon,
                      title: 'PNG Image',
                      desc: 'Crisp HD 2x Ultra',
                    },
                    {
                      format: 'jpg' as const,
                      icon: ImageIcon,
                      title: 'JPG Photo',
                      desc: 'Ukuran file ringkas',
                    },
                    {
                      format: 'pdf' as const,
                      icon: FileText,
                      title: 'PDF Document',
                      desc: 'Siap cetak A4/Doc',
                    },
                    {
                      format: 'svg' as const,
                      icon: FileCode,
                      title: 'SVG Vector',
                      desc: 'Skala tajam tak terbatas',
                    },
                  ].map((item) => {
                    const isSelected = selectedFormat === item.format;
                    return (
                      <button
                        key={item.format}
                        id={`btn-select-format-${item.format}`}
                        type="button"
                        onClick={() => setSelectedFormat(item.format)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-500 ring-2 ring-cyan-500/30 text-white'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight truncate">{item.title}</div>
                          <div className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles & Options */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Opsi Tambahan
                </label>

                {/* Transparent Toggle */}
                <label
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    selectedFormat === 'jpg'
                      ? 'bg-slate-950/40 border-slate-800/50 opacity-60 cursor-not-allowed'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    id="checkbox-export-transparent"
                    type="checkbox"
                    checked={transparent && selectedFormat !== 'jpg'}
                    onChange={(e) => setTransparent(e.target.checked)}
                    disabled={selectedFormat === 'jpg'}
                    className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>Latar Belakang Transparan</span>
                      {selectedFormat !== 'jpg' && (
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {selectedFormat === 'jpg'
                        ? 'Format JPG tidak mendukung latar transparan'
                        : 'Hapus latar belakang untuk presentasi atau dokumen'}
                    </div>
                  </div>
                </label>

                {/* Fit Canvas Paper */}
                <label className="flex items-center gap-3 p-2.5 rounded-xl border bg-slate-950/80 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                  <input
                    id="checkbox-export-fit-paper"
                    type="checkbox"
                    checked={canvasBounds}
                    onChange={(e) => setCanvasBounds(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-200">
                      Auto-Frame & Margin Seimbang
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Menambahkan padding proporsional di sekeliling diagram
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors text-center"
              >
                Batal
              </button>
              <button
                id="btn-confirm-download"
                type="button"
                disabled={isExporting || nodes.length === 0}
                onClick={handleExecuteExport}
                className="flex-[2] px-4 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/60 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyiapkan Berkas...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download {selectedFormat.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
