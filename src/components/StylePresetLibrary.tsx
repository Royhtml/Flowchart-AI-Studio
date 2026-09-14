import React, { useState, useEffect } from 'react';
import { FlowNode, StylePreset } from '../types';
import {
  Palette,
  Plus,
  Trash2,
  Check,
  Bookmark,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

export const BUILTIN_STYLE_PRESETS: StylePreset[] = [
  {
    id: 'preset-cyan-neon',
    name: 'Cyber Cyan',
    category: 'curated',
    fillColor: '#082f49',
    strokeColor: '#06b6d4',
    strokeWidth: 2,
    strokeStyle: 'solid',
    textColor: '#e0f2fe',
    fontSize: 13,
    fontWeight: 'medium',
    rounded: 10,
    shadow: 'glow-cyan',
  },
  {
    id: 'preset-emerald-process',
    name: 'Emerald Flow',
    category: 'curated',
    fillColor: '#064e3b',
    strokeColor: '#10b981',
    strokeWidth: 2,
    strokeStyle: 'solid',
    textColor: '#ecfdf5',
    fontSize: 13,
    fontWeight: 'medium',
    rounded: 10,
    shadow: 'glow-emerald',
  },
  {
    id: 'preset-violet-decision',
    name: 'Violet Logic',
    category: 'curated',
    fillColor: '#3b0764',
    strokeColor: '#c084fc',
    strokeWidth: 2,
    strokeStyle: 'solid',
    textColor: '#faf5ff',
    fontSize: 13,
    fontWeight: 'medium',
    rounded: 10,
    shadow: 'glow-violet',
  },
  {
    id: 'preset-amber-warning',
    name: 'Amber Glow',
    category: 'curated',
    fillColor: '#451a03',
    strokeColor: '#f59e0b',
    strokeWidth: 2,
    strokeStyle: 'solid',
    textColor: '#fffbeb',
    fontSize: 13,
    fontWeight: 'medium',
    rounded: 10,
    shadow: 'glow-amber',
  },
  {
    id: 'preset-indigo-saas',
    name: 'Indigo SaaS',
    category: 'curated',
    fillColor: '#1e1b4b',
    strokeColor: '#818cf8',
    strokeWidth: 2,
    strokeStyle: 'solid',
    textColor: '#eef2ff',
    fontSize: 13,
    fontWeight: 'bold',
    rounded: 12,
    shadow: 'subtle',
  },
  {
    id: 'preset-rose-danger',
    name: 'Rose Critical',
    category: 'curated',
    fillColor: '#4c0519',
    strokeColor: '#f43f5e',
    strokeWidth: 2,
    strokeStyle: 'solid',
    textColor: '#fff1f2',
    fontSize: 13,
    fontWeight: 'bold',
    rounded: 8,
    shadow: 'none',
  },
  {
    id: 'preset-slate-clean',
    name: 'Slate Minimal',
    category: 'curated',
    fillColor: '#1e293b',
    strokeColor: '#94a3b8',
    strokeWidth: 1.5,
    strokeStyle: 'solid',
    textColor: '#f8fafc',
    fontSize: 13,
    fontWeight: 'normal',
    rounded: 6,
    shadow: 'subtle',
  },
  {
    id: 'preset-obsidian-wire',
    name: 'Obsidian Wire',
    category: 'curated',
    fillColor: '#090d16',
    strokeColor: '#334155',
    strokeWidth: 2,
    strokeStyle: 'dashed',
    textColor: '#cbd5e1',
    fontSize: 12,
    fontWeight: 'normal',
    rounded: 4,
    shadow: 'none',
  },
];

const STORAGE_KEY = 'flowchart_custom_style_presets_v1';

interface StylePresetLibraryProps {
  selectedNode: FlowNode | null;
  selectedNodeIds?: string[];
  onApplyPreset: (preset: StylePreset) => void;
}

export const StylePresetLibrary: React.FC<StylePresetLibraryProps> = ({
  selectedNode,
  selectedNodeIds = [],
  onApplyPreset,
}) => {
  const [customPresets, setCustomPresets] = useState<StylePreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [lastAppliedId, setLastAppliedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
    } catch (e) {
      console.error('Failed to persist custom style presets', e);
    }
  }, [customPresets]);

  const handleSaveCurrentAsPreset = () => {
    if (!selectedNode) return;
    const name = newPresetName.trim() || `Custom Style ${customPresets.length + 1}`;
    const newPreset: StylePreset = {
      id: `custom-${Date.now()}`,
      name,
      category: 'custom',
      fillColor: selectedNode.fillColor,
      strokeColor: selectedNode.strokeColor,
      strokeWidth: selectedNode.strokeWidth,
      strokeStyle: selectedNode.strokeStyle,
      textColor: selectedNode.textColor,
      fontSize: selectedNode.fontSize,
      fontWeight: selectedNode.fontWeight,
      rounded: selectedNode.rounded,
      shadow: selectedNode.shadow,
    };

    setCustomPresets((prev) => [newPreset, ...prev]);
    setNewPresetName('');
    setIsAddingNew(false);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePresetClick = (preset: StylePreset) => {
    onApplyPreset(preset);
    setLastAppliedId(preset.id);
    setTimeout(() => {
      setLastAppliedId(null);
    }, 1200);
  };

  const count = selectedNodeIds.length > 1 ? selectedNodeIds.length : (selectedNode ? 1 : 0);

  return (
    <div className="space-y-3 pt-3 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
            Style Presets
          </span>
        </div>
        {count > 0 && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            {count > 1 ? `Apply to ${count} nodes` : 'Apply to node'}
          </span>
        )}
      </div>

      {/* Save Current Style Button */}
      {selectedNode && (
        <div>
          {!isAddingNew ? (
            <button
              onClick={() => {
                setIsAddingNew(true);
                setNewPresetName(`${selectedNode.label.slice(0, 15)} Style`);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 hover:text-white transition-colors group"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Save Current Style as Preset</span>
            </button>
          ) : (
            <div className="p-2 bg-slate-950 rounded-xl border border-cyan-500/50 space-y-2 animate-in fade-in duration-150">
              <span className="text-[10px] font-semibold text-slate-400 block">
                Preset Name:
              </span>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. Neon Step"
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCurrentAsPreset();
                  if (e.key === 'Escape') setIsAddingNew(false);
                }}
              />
              <div className="flex gap-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-2 py-1 rounded text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCurrentAsPreset}
                  className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-medium text-white flex items-center gap-1"
                >
                  <Bookmark className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Presets Section (if any exist) */}
      {customPresets.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Bookmark className="w-3 h-3 text-amber-400" />
            <span>My Custom Presets</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {customPresets.map((preset) => {
              const isApplied = lastAppliedId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  disabled={count === 0}
                  className={`group relative flex flex-col p-2 rounded-xl border text-left transition-all ${
                    count === 0
                      ? 'opacity-60 cursor-not-allowed border-slate-800 bg-slate-950/40'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/70 hover:bg-slate-900 cursor-pointer'
                  } ${isApplied ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-slate-950' : ''}`}
                  title={`Apply ${preset.name}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    {/* Mini Swatch */}
                    <div
                      className="w-5 h-4 rounded border flex items-center justify-center text-[8px] font-bold"
                      style={{
                        backgroundColor: preset.fillColor,
                        borderColor: preset.strokeColor,
                        borderWidth: `${Math.min(preset.strokeWidth, 2)}px`,
                        color: preset.textColor,
                      }}
                    >
                      Aa
                    </div>

                    <button
                      onClick={(e) => handleDeleteCustom(preset.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-opacity"
                      title="Delete preset"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-[11px] font-medium text-slate-200 truncate w-full">
                    {preset.name}
                  </span>

                  {isApplied && (
                    <span className="absolute bottom-1 right-1 text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Curated Presets Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Curated Presets</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {BUILTIN_STYLE_PRESETS.map((preset) => {
            const isApplied = lastAppliedId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                disabled={count === 0}
                className={`group relative flex flex-col p-2 rounded-xl border text-left transition-all ${
                  count === 0
                    ? 'opacity-60 cursor-not-allowed border-slate-800/80 bg-slate-950/40'
                    : 'border-slate-800 hover:border-cyan-500/50 bg-slate-950/70 hover:bg-slate-900 cursor-pointer shadow-sm hover:shadow-cyan-950/40'
                } ${isApplied ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-slate-950' : ''}`}
                title={`Apply "${preset.name}" style (${preset.strokeColor})`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  {/* Swatch preview */}
                  <div
                    className="w-full h-5 rounded-md flex items-center justify-center text-[9px] font-bold transition-transform group-hover:scale-[1.02]"
                    style={{
                      backgroundColor: preset.fillColor,
                      border: `${preset.strokeWidth}px ${preset.strokeStyle} ${preset.strokeColor}`,
                      color: preset.textColor,
                    }}
                  >
                    Aa
                  </div>
                </div>

                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-medium text-slate-200 truncate">
                    {preset.name}
                  </span>
                  {isApplied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: preset.strokeColor }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
