import React from 'react';
import { Terminal, X, Trash2, Download, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { SimulationLog } from '../types';

interface ExecutionConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SimulationLog[];
  onClearLogs: () => void;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  if (!isOpen) return null;

  const handleDownloadLogs = () => {
    if (logs.length === 0) return;
    const content = logs
      .map(
        (l, i) =>
          `[${l.timestamp}] #${i + 1} [${l.type.toUpperCase()}] ${l.nodeLabel}: ${l.message}`
      )
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `workflow-log-${Date.now()}.txt`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="execution-console-panel"
      className="absolute bottom-20 left-1/2 -translate-x-1/2 w-11/12 max-w-3xl h-64 bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-2xl z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3"
    >
      {/* Console Header */}
      <div className="h-10 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Realtime Workflow Execution Console
          </span>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/40">
            {logs.length} Events
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownloadLogs}
            disabled={logs.length === 0}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
            title="Download Log (TXT)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-40"
            title="Clear Logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ml-1"
            title="Close Console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Stream Body */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar bg-slate-950/70">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Sparkles className="w-6 h-6 text-slate-600 mb-2" />
            <span>No simulation activity yet. Click "Run Workflow" to start realtime execution tracing.</span>
          </div>
        ) : (
          logs.map((log, index) => {
            let badgeClass = 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30';
            if (log.type === 'success') {
              badgeClass = 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30';
            } else if (log.type === 'branch') {
              badgeClass = 'text-amber-400 bg-amber-950/60 border-amber-500/30';
            } else if (log.type === 'warning' || log.type === 'error') {
              badgeClass = 'text-rose-400 bg-rose-950/60 border-rose-500/30';
            }

            return (
              <div
                key={log.id}
                className="flex items-start gap-2.5 py-1 px-2 rounded hover:bg-slate-900/60 transition-colors border-l-2 border-transparent hover:border-cyan-400"
              >
                <span className="text-[10px] text-slate-500 shrink-0 font-mono mt-0.5">
                  {log.timestamp}
                </span>

                <span className="text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">
                  #{index + 1}
                </span>

                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border shrink-0 ${badgeClass}`}
                >
                  {log.type}
                </span>

                <div className="flex-1 flex items-center gap-1.5 flex-wrap text-slate-300">
                  <span className="font-semibold text-slate-100">
                    [{log.nodeLabel}]
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
