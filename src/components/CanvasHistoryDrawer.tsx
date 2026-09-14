import React, { useState, useEffect } from 'react';
import {
  History,
  X,
  RotateCcw,
  Trash2,
  BookmarkPlus,
  HardDrive,
  Clock,
  Sparkles,
  Check,
  AlertTriangle,
  ChevronRight,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { FlowNode, FlowConnector } from '../types';
import {
  CanvasHistoryItem,
  getCanvasHistory,
  addCanvasHistorySnapshot,
  deleteCanvasHistoryItem,
  clearCanvasHistory,
  getHistoryStorageStats,
} from '../utils/canvasHistoryStorage';

interface CanvasHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  currentNodes: FlowNode[];
  currentConnectors: FlowConnector[];
  onRestoreHistory: (item: CanvasHistoryItem) => void;
}

export const CanvasHistoryDrawer: React.FC<CanvasHistoryDrawerProps> = ({
  isOpen,
  onClose,
  projectName,
  currentNodes,
  currentConnectors,
  onRestoreHistory,
}) => {
  const [historyItems, setHistoryItems] = useState<CanvasHistoryItem[]>([]);
  const [stats, setStats] = useState(getHistoryStorageStats());
  const [checkpointName, setCheckpointName] = useState('');
  const [justRestoredId, setJustRestoredId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Refresh history items and stats whenever drawer is opened
  const refreshHistory = () => {
    const items = getCanvasHistory();
    // Sort newest first
    setHistoryItems([...items].reverse());
    setStats(getHistoryStorageStats());
  };

  useEffect(() => {
    if (isOpen) {
      refreshHistory();
      setConfirmClearAll(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCheckpoint = () => {
    const label = checkpointName.trim() || `Checkpoint ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    addCanvasHistorySnapshot({
      label,
      projectName,
      nodes: currentNodes,
      connectors: currentConnectors,
    });
    setCheckpointName('');
    refreshHistory();
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCanvasHistoryItem(id);
    refreshHistory();
  };

  const handleClearAll = () => {
    clearCanvasHistory();
    setConfirmClearAll(false);
    refreshHistory();
  };

  const handleRestore = (item: CanvasHistoryItem) => {
    onRestoreHistory(item);
    setJustRestoredId(item.id);
    setTimeout(() => setJustRestoredId(null), 2500);
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    let timeAgo = '';
    if (diffSec < 60) timeAgo = 'Baru saja';
    else if (diffMin < 60) timeAgo = `${diffMin}m yang lalu`;
    else if (diffHours < 24) timeAgo = `${diffHours}j yang lalu`;
    else timeAgo = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    const formattedTime = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { timeAgo, formattedTime, fullDate: d.toLocaleString('id-ID') };
  };

  // Determine progress bar color based on percentage
  const getProgressColor = (pct: number) => {
    if (pct < 60) return 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]';
    if (pct < 85) return 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]';
    return 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer from Right */}
      <aside
        id="canvas-history-drawer"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 border-l border-slate-700/80 shadow-2xl flex flex-col backdrop-blur-xl text-slate-100 animate-in slide-in-from-right duration-300 select-none"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wide text-white">Riwayat Canvas</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  {stats.count} snapshot
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Penyimpanan lokal terbatas 1MB</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Tutup Riwayat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LocalStorage 1MB Meter Banner */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kapasitas LocalStorage</span>
            </div>
            <div className="font-mono text-xs font-semibold text-slate-200">
              <span className={stats.percentage > 85 ? 'text-rose-400' : 'text-cyan-400'}>
                {stats.formattedUsed}
              </span>
              <span className="text-slate-500"> / {stats.formattedMax}</span>
              <span className="ml-1 text-[11px] text-slate-400">({stats.percentage}%)</span>
            </div>
          </div>

          {/* Meter Bar */}
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                stats.percentage
              )}`}
              style={{ width: `${Math.max(2, Math.min(100, stats.percentage))}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
            <span>Dibatasi maks. 1 MB per perangkat</span>
            <span>Auto-pruning data tertua jika penuh</span>
          </div>
        </div>

        {/* Create Manual Checkpoint Box */}
        <div className="p-3.5 border-b border-slate-800/90 bg-slate-900/60 shrink-0">
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simpan Checkpoint Saat Ini</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCheckpoint()}
              placeholder="Beri label checkpoint (opsional)..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              onClick={handleSaveCheckpoint}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0 active:scale-95"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
          </div>
        </div>

        {/* History List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {historyItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-2xl text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300 mb-1">Belum Ada Riwayat Tersimpan</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-4">
                Riwayat perubahan canvas akan otomatis tersimpan di browser ini, atau simpan checkpoint secara manual di atas.
              </p>
              <button
                onClick={handleSaveCheckpoint}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-cyan-300 flex items-center gap-1.5 transition-colors"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Simpan Versi Sekarang</span>
              </button>
            </div>
          ) : (
            historyItems.map((item) => {
              const { timeAgo, formattedTime, fullDate } = formatTimestamp(item.timestamp);
              const isJustRestored = justRestoredId === item.id;
              const itemKb = (item.sizeBytes / 1024).toFixed(1);

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all duration-200 group ${
                    isJustRestored
                      ? 'bg-emerald-950/60 border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/40'
                      : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white truncate group-hover:text-cyan-300 transition-colors">
                          {item.label}
                        </span>
                        {isJustRestored && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-300 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/40">
                            <Check className="w-2.5 h-2.5" /> Dipulihkan
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5" title={fullDate}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {timeAgo}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">{formattedTime}</span>
                      </div>
                    </div>

                    {/* Delete Item Button */}
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors opacity-60 group-hover:opacity-100"
                      title="Hapus snapshot ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-1.5 text-[10px] mb-2.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono flex items-center gap-1 border border-slate-700/60">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      {item.nodeCount} node
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono border border-slate-700/60">
                      {item.connectorCount} koneksi
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono border border-slate-700/60">
                      {itemKb} KB
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 truncate max-w-[120px]">
                      {item.projectName}
                    </span>
                  </div>

                  {/* Restore Action Button */}
                  <button
                    onClick={() => handleRestore(item)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950 hover:border-cyan-500/50 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-cyan-300 transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400 group-hover/btn:-rotate-45 transition-transform" />
                    <span>Pulihkan Canvas ke Versi Ini</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800/90 bg-slate-900/80 flex items-center justify-between shrink-0">
          {confirmClearAll ? (
            <div className="w-full flex items-center justify-between gap-2 p-1.5 bg-rose-950/70 border border-rose-500/40 rounded-xl">
              <span className="text-[11px] text-rose-300 font-medium">Hapus semua riwayat?</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-colors"
                >
                  Ya, Hapus
                </button>
                <button
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmClearAll(true)}
                disabled={historyItems.length === 0}
                className={`text-[11px] font-medium flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                  historyItems.length === 0
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Riwayat</span>
              </button>

              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-colors"
              >
                Tutup
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
