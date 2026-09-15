import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Terminal,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SimulationState, FlowNode } from '../types';

interface SimulationControllerProps {
  simulationState: SimulationState;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: number) => void;
  onToggleConsole: () => void;
  isConsoleOpen: boolean;
  currentNode: FlowNode | null;
  decisionBranches: Array<{ connectorId: string; label: string; toNodeLabel: string }> | null;
  onSelectDecisionBranch: (connectorId: string) => void;
  isTTSEnabled?: boolean;
  onToggleTTS?: () => void;
  onTestTTS?: () => void;
}

export const SimulationController: React.FC<SimulationControllerProps> = ({
  simulationState,
  onPlay,
  onPause,
  onStepForward,
  onReset,
  onChangeSpeed,
  onToggleConsole,
  isConsoleOpen,
  currentNode,
  decisionBranches,
  onSelectDecisionBranch,
  isTTSEnabled = true,
  onToggleTTS,
  onTestTTS,
}) => {
  const isRunning = simulationState.status === 'running';
  
  // Drag state
  const [position, setPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;
    setPosition({
      x: dragStart.current.posX + dx,
      y: dragStart.current.posY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div 
      className="absolute z-30 flex flex-col items-center gap-2"
      style={{
        bottom: `${24 - position.y}px`,
        left: `calc(50% + ${position.x}px)`,
        transform: 'translateX(-50%)',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Interactive Decision Popup if paused at a Decision Node */}
      {decisionBranches && decisionBranches.length > 0 && (
        <div className="bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-3 shadow-[0_0_30px_rgba(245,158,11,0.35)] backdrop-blur-xl animate-in fade-in zoom-in-95 flex flex-col items-center text-center max-w-md">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <GitBranch className="w-4 h-4" />
            <span>Decision Branch: Choose Next Path</span>
          </div>
          <p className="text-xs text-slate-200 mb-2.5 font-medium">
            Execution reached node <span className="text-cyan-300 font-bold">"{currentNode?.label}"</span>. Direct path:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {decisionBranches.map((branch) => (
              <button
                key={branch.connectorId}
                onClick={() => onSelectDecisionBranch(branch.connectorId)}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-500/60 font-semibold text-xs transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1.5"
              >
                <span>{branch.label || 'Continue'}</span>
                <span className="text-[10px] text-amber-300/80 font-normal">→ {branch.toNodeLabel}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Glass Control Bar */}
      <div
        id="simulation-control-bar"
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl select-none"
      >
        {/* Status Indicator */}
        <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
          <div className="relative flex items-center justify-center">
            {isRunning ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="absolute w-4 h-4 rounded-full bg-cyan-400 animate-ping opacity-75" />
              </>
            ) : simulationState.status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-200 leading-tight">
              {isRunning
                ? 'Running'
                : simulationState.status === 'completed'
                ? 'Completed'
                : simulationState.status === 'paused'
                ? 'Paused'
                : 'Ready'}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              Step #{simulationState.stepCount}
            </span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <button
              onClick={onPause}
              className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all active:scale-95"
              title="Pause Simulation"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              title="Run Simulation"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          <button
            onClick={onStepForward}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95"
            title="Step Forward (1 Node)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onReset}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all active:scale-95"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 pl-3 border-l border-slate-800">
          <Gauge className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  simulationState.speed === s
                    ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Console / Log Drawer Toggle */}
        <button
          onClick={onToggleConsole}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
            isConsoleOpen
              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="Toggle Realtime Execution Console"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logs</span>
          {simulationState.logs.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
              {simulationState.logs.length}
            </span>
          )}
        </button>

        {/* Female Voice TTS Narration Toggle */}
        {onToggleTTS && (
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <button
              id="btn-female-tts"
              onClick={onToggleTTS}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isTTSEnabled
                  ? 'bg-pink-950/80 text-pink-300 border-pink-500/50 shadow-md shadow-pink-950/40 ring-1 ring-pink-500/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 border-slate-700'
              }`}
              title={
                isTTSEnabled
                  ? 'TTS Suara Perempuan Aktif (Klik untuk nonaktifkan narasi)'
                  : 'Aktifkan Narasi Suara Perempuan saat Animasi'
              }
            >
              {isTTSEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="hidden md:inline font-medium">TTS Perempuan</span>
              {isTTSEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              )}
            </button>
            {onTestTTS && isTTSEnabled && (
              <button
                type="button"
                onClick={onTestTTS}
                className="px-1.5 py-1 rounded-lg bg-pink-950/40 hover:bg-pink-900/60 text-pink-300 border border-pink-500/30 text-[10px] transition-colors"
                title="Coba contoh suara narator perempuan"
              >
                Tes
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
