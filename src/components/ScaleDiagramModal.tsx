import React, { useState } from 'react';
import {
  X,
  Scaling,
  Maximize2,
  Minimize2,
  Sparkles,
  Percent,
  Check
} from 'lucide-react';
import { FlowNode } from '../types';

interface ScaleDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes?: FlowNode[];
  selectedNodeId?: string | null;
  selectedNodeCount?: number;
  totalNodeCount?: number;
  onApplyScale?: (factor: number, onlySelected: boolean) => void;
  onScaleDiagram?: (factor: number, scalePositions: boolean, selectedOnly: boolean) => void;
}

export const ScaleDiagramModal: React.FC<ScaleDiagramModalProps> = ({
  isOpen,
  onClose,
  nodes = [],
  selectedNodeId = null,
  selectedNodeCount,
  totalNodeCount,
  onApplyScale,
  onScaleDiagram,
}) => {
  const isAnyNodeSelected = selectedNodeId ? true : (selectedNodeCount ? selectedNodeCount > 0 : false);
  const [percent, setPercent] = useState<number>(100);
  const [targetScope, setTargetScope] = useState<'all' | 'selected'>(
    isAnyNodeSelected ? 'selected' : 'all'
  );

  if (!isOpen) return null;

  const presets = [50, 75, 80, 90, 100, 110, 125, 150, 200];

  const handleApply = () => {
    const factor = percent / 100;
    const isSelected = targetScope === 'selected';
    if (onApplyScale) {
      onApplyScale(factor, isSelected);
    }
    if (onScaleDiagram) {
      onScaleDiagram(factor, true, isSelected);
    }
    onClose();
  };

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const totalCount = totalNodeCount ?? nodes.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
              <Scaling className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Scale Flowchart Elements
              </h2>
              <p className="text-xs text-slate-400">
                Shrink or enlarge diagram shapes and dimensions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Target Scope */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Apply Scaling To:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetScope('all')}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                  targetScope === 'all'
                    ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span>Entire Flowchart</span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {totalCount} nodes
                </span>
              </button>

              <button
                type="button"
                disabled={!isAnyNodeSelected}
                onClick={() => setTargetScope('selected')}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                  targetScope === 'selected'
                    ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                } ${!isAnyNodeSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span>Selected Element</span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {isAnyNodeSelected ? '1 selected' : 'None'}
                </span>
              </button>
            </div>
          </div>

          {/* Scale Slider and Value */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Scaling Factor
              </label>
              <span className="text-base font-bold font-mono text-cyan-400">
                {percent}%
              </span>
            </div>

            <input
              type="range"
              min="30"
              max="250"
              step="5"
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>30% (Shrink)</span>
              <span>100% (Original)</span>
              <span>250% (Enlarge)</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPercent(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    percent === p
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Note / Info */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              {targetScope === 'all'
                ? 'Scaling all elements recalculates coordinates from diagram center and resizes widths, heights, and connection lines.'
                : `Scaling "${selectedNode?.label || 'selected element'}" will adjust its width and height proportionally.`}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-950 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Apply Scale ({percent}%)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
