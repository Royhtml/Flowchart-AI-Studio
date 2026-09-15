import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Grid,
  Magnet,
  Download,
  Play,
  Sparkles,
  Layers,
  FileJson,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  Trash2,
  MapPin,
  Workflow,
  Sparkle,
  Code2,
  Sliders,
  Shapes,
  History,
  Bot,
  Wand2,
  Brain,
} from 'lucide-react';
import { CanvasState } from '../types';

// Official ReactJS Atom Logo Component (Bawaan ReactJS)
export const ReactIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="-11.5 -10.23174 23 20.46348"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="0" cy="0" r="2.05" fill="#00d8ff" />
    <g stroke="#00d8ff" strokeWidth="1" fill="none">
      <ellipse rx="11" ry="4.2" />
      <ellipse rx="11" ry="4.2" transform="rotate(60)" />
      <ellipse rx="11" ry="4.2" transform="rotate(120)" />
    </g>
  </svg>
);

interface ToolbarProps {
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canvasState: CanvasState;
  onUpdateCanvasState: (updates: Partial<CanvasState>) => void;
  onResetZoom: () => void;
  onExportPNG: (format?: any, transparent?: any, canvasBounds?: any) => void;
  onOpenExportModal?: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenTemplates: () => void;
  onOpenCodePreview: () => void;
  onOpenLLMSettings?: () => void;
  onClearCanvas: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
  nodeCount: number;
  connectorCount: number;
  onOpenLayersPanel?: () => void;
  onOpenScaleModal?: () => void;
  isLayersOpen?: boolean;
  onSetZoom?: (zoom: number) => void;
  onAutoArrange?: (direction: 'TB' | 'LR') => void;
  isLeftSidebarOpen?: boolean;
  onToggleLeftSidebar?: () => void;
  isRightSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
  isAIChatBarOpen?: boolean;
  onToggleAIChatBar?: () => void;
  onOpenMoreShapes?: () => void;
  onOpenHistory?: () => void;
  isHistoryOpen?: boolean;
  historyCount?: number;
  isDetailAIOpen?: boolean;
  onOpenDetailAI?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  projectName,
  onUpdateProjectName,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canvasState,
  onUpdateCanvasState,
  onResetZoom,
  onExportPNG,
  onOpenExportModal,
  onExportJSON,
  onImportJSON,
  onOpenTemplates,
  onOpenCodePreview,
  onOpenLLMSettings,
  onClearCanvas,
  isSimulating,
  onToggleSimulation,
  onResetSimulation,
  nodeCount,
  connectorCount,
  onOpenLayersPanel,
  onOpenScaleModal,
  isLayersOpen,
  onSetZoom,
  onAutoArrange,
  isLeftSidebarOpen,
  onToggleLeftSidebar,
  isRightSidebarOpen,
  onToggleRightSidebar,
  isAIChatBarOpen,
  onToggleAIChatBar,
  onOpenMoreShapes,
  onOpenHistory,
  isHistoryOpen,
  historyCount,
  isDetailAIOpen,
  onOpenDetailAI,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(projectName);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isAutoLayoutMenuOpen, setIsAutoLayoutMenuOpen] = useState(false);

  // Horizontal slide / drag scroll for toolbar
  const toolbarRef = React.useRef<HTMLElement>(null);
  const isDraggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const scrollLeftRef = React.useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, label, a')) return;
    if (!toolbarRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - toolbarRef.current.offsetLeft;
    scrollLeftRef.current = toolbarRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !toolbarRef.current) return;
    e.preventDefault();
    const x = e.pageX - toolbarRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    toolbarRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    onUpdateProjectName(titleInput.trim() || 'Untitled Flowchart');
  };

  return (
    <header
      id="main-toolbar"
      ref={toolbarRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      className="h-14 bg-slate-900 border-b border-slate-800 px-2 sm:px-3.5 flex items-center justify-between select-none relative z-40 text-slate-200 overflow-x-auto scrollbar-none gap-1.5 sm:gap-3 shrink-0 scroll-smooth cursor-grab active:cursor-grabbing"
    >
      {/* Left: Branding & Project Name */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Toggle Left Toolbox (Shapes) Button */}
        {onToggleLeftSidebar && (
          <button
            id="btn-toggle-left-sidebar"
            onClick={onToggleLeftSidebar}
            className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
              isLeftSidebarOpen
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Buka / Tutup Toolbox Shapes"
          >
            <ReactIcon className="w-4 h-4 text-cyan-400" />
            <span className="hidden lg:inline">Shapes</span>
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-2.5 pr-2 sm:pr-3 border-r border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-slate-950/80 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0">
            <ReactIcon className="w-5 h-5 animate-[spin_16s_linear_infinite]" />
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-xs font-bold tracking-wider text-slate-100 uppercase">
              Flowchart Studio
            </span>
            <span className="text-[10px] text-cyan-400 font-medium">Dark Mode Pro</span>
          </div>
        </div>

        {/* Project Name */}
        <div className="flex items-center">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="bg-slate-800 text-xs sm:text-sm font-semibold px-2 py-0.5 rounded border border-cyan-500 outline-none text-white max-w-[160px] sm:max-w-[220px]"
            />
          ) : (
            <button
              onClick={() => {
                setTitleInput(projectName);
                setIsEditingTitle(true);
              }}
              className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-colors flex items-center gap-1.5"
              title="Click to rename diagram"
            >
              <span className="max-w-[120px] sm:max-w-[180px] truncate">{projectName}</span>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                {nodeCount} nodes
              </span>
              <span
                className="hidden md:flex text-[10px] text-emerald-400/90 bg-emerald-950/60 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium items-center gap-1"
                title="All changes auto-saved locally"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Saved
              </span>
            </button>
          )}

          {/* Project File Menu (JSON Backup, Import, Clear) */}
          <div className="relative">
            <button
              id="btn-project-file-menu"
              onClick={() => setIsProjectMenuOpen((prev) => !prev)}
              className={`p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors ${
                isProjectMenuOpen ? 'bg-slate-800 text-cyan-400' : ''
              }`}
              title="File & Project Menu (Backup JSON, Import JSON, Clear Canvas)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isProjectMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProjectMenuOpen(false)}
                />
                <div className="absolute left-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl py-1.5 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    File & Project
                  </div>

                  <button
                    onClick={() => {
                      setIsProjectMenuOpen(false);
                      onExportJSON();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <div className="p-1 rounded bg-indigo-950 text-indigo-400">
                      <FileJson className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-100">Backup JSON Project</div>
                      <div className="text-[10px] text-slate-400">Simpan state diagram lengkap</div>
                    </div>
                  </button>

                  <label className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer">
                    <div className="p-1 rounded bg-emerald-950 text-emerald-400">
                      <Upload className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-100">Import JSON Project</div>
                      <div className="text-[10px] text-slate-400">Buka diagram yang tersimpan</div>
                    </div>
                    <input
                      type="file"
                      accept=".json,.flow"
                      onChange={(e) => {
                        setIsProjectMenuOpen(false);
                        onImportJSON(e);
                      }}
                      className="hidden"
                    />
                  </label>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    onClick={() => {
                      setIsProjectMenuOpen(false);
                      onClearCanvas();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors"
                  >
                    <div className="p-1 rounded bg-rose-950 text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-medium">Clear Canvas</div>
                      <div className="text-[10px] text-rose-400/80">Hapus semua node dan konektor</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 sm:gap-1 pl-1 sm:pl-2 border-l border-slate-800">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              canUndo ? 'text-slate-200' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              canRedo ? 'text-slate-200' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle: Layers, Auto-Layout, and Grid Controls */}
      <div className="hidden lg:flex items-center gap-1.5 shrink-0">
        {/* Layers & Z-Order Manager (Draw.io feature) */}
        {onOpenLayersPanel && (
          <button
            onClick={onOpenLayersPanel}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              isLayersOpen
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-slate-950/70 border-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Layers & Z-Order Panel (Manage layer hierarchy)"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Layers</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
              {nodeCount}
            </span>
          </button>
        )}

        {/* Auto-Layout (Dagre Graph Arrangement) */}
        {onAutoArrange && (
          <div className="relative">
            <button
              onClick={() => setIsAutoLayoutMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                isAutoLayoutMenuOpen
                  ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-sm'
                  : 'bg-slate-950/70 border-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title="Auto-Arrange Diagram Nodes (Dagre Algorithm)"
            >
              <Workflow className="w-3.5 h-3.5 text-cyan-400" />
              <span>Auto-Layout</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isAutoLayoutMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsAutoLayoutMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1 w-64 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-1 backdrop-blur-md">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span>Arrange Graph (Dagre)</span>
                    <span className="text-cyan-400 font-mono text-[9px] bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-500/30">
                      DAG Auto
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onAutoArrange('TB');
                      setIsAutoLayoutMenuOpen(false);
                    }}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 text-left transition-colors group"
                  >
                    <Workflow className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>Top → Bottom Flow</span>
                        <span className="text-[10px] text-cyan-400 font-mono">TB</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Vertical hierarchy, standard flowchart
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      onAutoArrange('LR');
                      setIsAutoLayoutMenuOpen(false);
                    }}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 text-left transition-colors group"
                  >
                    <Workflow className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0 rotate-[-90deg] group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>Left → Right Pipeline</span>
                        <span className="text-[10px] text-indigo-400 font-mono">LR</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Horizontal timeline, step-by-step process
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Grid & Magnet Controls */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800/90 text-xs">
          {/* Grid Type Selector */}
          <button
            onClick={() => {
              const types: Array<'dots' | 'grid' | 'none'> = ['dots', 'grid', 'none'];
              const nextIdx = (types.indexOf(canvasState.gridType) + 1) % types.length;
              onUpdateCanvasState({ gridType: types[nextIdx] });
            }}
            className="px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1 text-[11px]"
            title="Cycle Grid Mode (Dots / Grid / None)"
          >
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
            <span className="capitalize">{canvasState.gridType}</span>
          </button>

          {/* Snap to Grid */}
          <button
            onClick={() =>
              onUpdateCanvasState({ snapToGrid: !canvasState.snapToGrid })
            }
            className={`px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors ${
              canvasState.snapToGrid
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Snap to Grid"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>

          {/* Minimap Toggle */}
          <button
            onClick={() =>
              onUpdateCanvasState({ showMinimap: !canvasState.showMinimap })
            }
            className={`p-1 rounded transition-colors ${
              canvasState.showMinimap
                ? 'text-cyan-400 bg-cyan-950/60'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle Canvas Overview"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Actions (Templates, Code Preview, AI LLM, Simulation, Export PNG) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* AI Flowchart Bar Toggle Button */}
        {onToggleAIChatBar && (
          <button
            id="btn-toggle-ai-bar"
            onClick={onToggleAIChatBar}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              isAIChatBarOpen
                ? 'bg-cyan-950/90 border border-cyan-500/60 text-cyan-300 ring-1 ring-cyan-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 hover:text-cyan-300'
            }`}
            title="Tampilkan / Sembunyikan AI Flowchart Generator Bar"
          >
            <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">AI Flow</span>
          </button>
        )}

        {/* Fitur Bentuk Lainnya, Custom Bentuk & AI Shape Generator di Samping AI Chat */}
        {onOpenMoreShapes && (
          <button
            id="btn-more-shapes"
            onClick={onOpenMoreShapes}
            className="px-2 sm:px-2.5 py-1.5 bg-gradient-to-r from-cyan-950/90 via-slate-800/90 to-blue-950/90 hover:from-cyan-900/90 hover:to-blue-900/90 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] group shrink-0"
            title="Bentuk Lainnya, Desain Custom Bentuk & AI Generated Bentuk"
          >
            <Shapes className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Bentuk Lainnya</span>
          </button>
        )}

        {/* Fitur Riwayat Canvas (LocalStorage 1MB & Checkpoint) */}
        {onOpenHistory && (
          <button
            id="btn-canvas-history"
            onClick={onOpenHistory}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shrink-0 ${
              isHistoryOpen
                ? 'bg-cyan-950/90 border border-cyan-500/60 text-cyan-300 ring-1 ring-cyan-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 hover:text-cyan-300'
            }`}
            title="Riwayat Canvas (Simpan Riwayat di LocalStorage dibatasi 1MB)"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Riwayat</span>
            {typeof historyCount === 'number' && historyCount > 0 && (
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                {historyCount}
              </span>
            )}
          </button>
        )}

        {/* Toggle Right Inspector & AI Chat Button */}
        {onToggleRightSidebar && (
          <button
            id="btn-toggle-right-sidebar"
            onClick={onToggleRightSidebar}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              isRightSidebarOpen && !isDetailAIOpen
                ? 'bg-cyan-950/90 border border-cyan-500/60 text-cyan-300 ring-1 ring-cyan-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 hover:text-cyan-300'
            }`}
            title="Buka / Tutup Properties & AI Bot Chat"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Inspector</span>
          </button>
        )}

        {/* Detail AI Canvas Project Consultant Button */}
        {onOpenDetailAI && (
          <button
            id="btn-detail-ai-toolbar"
            onClick={onOpenDetailAI}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              isDetailAIOpen
                ? 'bg-purple-950/90 border border-purple-500/60 text-purple-300 ring-1 ring-purple-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 hover:text-purple-300'
            }`}
            title="Detail AI: Analisis & Pembahasan Khusus Proyek Canvas Ini"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Detail AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          </button>
        )}

        {/* Code Preview & Live Edit (flow.io) */}
        <button
          id="btn-code-preview"
          onClick={onOpenCodePreview}
          className="px-2 sm:px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm hover:border-cyan-500/50 hover:text-cyan-300"
          title="Open Project Code Editor & FlowScript DSL"
        >
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">Code Editor</span>
        </button>

        {/* AI & LLM Settings Button */}
        {onOpenLLMSettings && (
          <button
            id="btn-llm-settings"
            onClick={onOpenLLMSettings}
            className="px-2 sm:px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm hover:border-amber-500/50 hover:text-amber-300"
            title="Configure AI Models & Keys (Gemini, OpenAI, Claude, Local 127.0.0.1:8088)"
          >
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI Settings</span>
          </button>
        )}

        {/* Templates Button */}
        <button
          id="btn-templates"
          onClick={onOpenTemplates}
          className="px-2 sm:px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          title="Workflow Templates Gallery"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Templates</span>
        </button>

        {/* Real-time Workflow Simulation Trigger */}
        <button
          id="btn-simulate"
          onClick={onToggleSimulation}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all shadow-md shrink-0 ${
            isSimulating
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 hover:bg-amber-500/30 ring-2 ring-amber-500/30'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50'
          }`}
          title="Simulate workflow execution with animated pulses"
        >
          {isSimulating ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Flow</span>
            </>
          )}
        </button>

        {/* Export Pop-up Button */}
        <button
          id="btn-export-main"
          onClick={() => {
            if (onOpenExportModal) {
              onOpenExportModal();
            } else {
              onExportPNG('png', false, true);
            }
          }}
          title="Buka Pop-up Download & Preview Canvas"
          className="px-2.5 sm:px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0 active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Export Canvas</span>
          <span className="xs:hidden">Export</span>
        </button>
      </div>
    </header>
  );
};
