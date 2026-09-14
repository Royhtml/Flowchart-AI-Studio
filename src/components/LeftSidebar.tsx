import React from 'react';
import {
  Square,
  Diamond,
  Database,
  FileText,
  Cloud,
  Clock,
  StickyNote,
  Boxes,
  CircleDot,
  Minus,
  Spline,
  GitFork,
  HelpCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { ShapeType, ConnectorType } from '../types';

interface LeftSidebarProps {
  onAddShape: (type: ShapeType) => void;
  activeConnectorType: ConnectorType;
  onChangeConnectorType: (type: ConnectorType) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onClose?: () => void;
}

interface ShapeItemDef {
  type: ShapeType;
  title: string;
  desc: string;
  icon: React.ReactNode;
  defaultColor: string;
  strokeColor: string;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onAddShape,
  activeConnectorType,
  onChangeConnectorType,
  isOpen,
  onToggleOpen,
  onClose,
}) => {
  const [internalCollapsed, setInternalCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const isCollapsed = isOpen !== undefined ? !isOpen : internalCollapsed;

  const handleToggle = () => {
    if (onToggleOpen) {
      onToggleOpen();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalCollapsed(true);
    }
  };

  const standardShapes: ShapeItemDef[] = [
    {
      type: 'terminator',
      title: 'Terminator',
      desc: 'Capsule: Start & end of process',
      icon: (
        <div className="w-8 h-4 rounded-full border-2 border-emerald-400 bg-emerald-950/60" />
      ),
      defaultColor: '#0f2b1d',
      strokeColor: '#10b981',
    },
    {
      type: 'process',
      title: 'Process',
      desc: 'Rectangle: Action or operation step',
      icon: (
        <div className="w-7 h-4 rounded-sm border-2 border-blue-400 bg-blue-950/60" />
      ),
      defaultColor: '#1e293b',
      strokeColor: '#38bdf8',
    },
    {
      type: 'decision',
      title: 'Decision',
      desc: 'Diamond: Conditional branch (Yes / No)',
      icon: (
        <div className="w-5 h-5 rotate-45 border-2 border-amber-400 bg-amber-950/60" />
      ),
      defaultColor: '#2b1e3a',
      strokeColor: '#f59e0b',
    },
    {
      type: 'input-output',
      title: 'Input / Output',
      desc: 'Parallelogram: Data input or output',
      icon: (
        <div className="w-7 h-4 -skew-x-12 border-2 border-cyan-400 bg-cyan-950/60" />
      ),
      defaultColor: '#172554',
      strokeColor: '#60a5fa',
    },
    {
      type: 'document',
      title: 'Document',
      desc: 'Wavy base: Document or generated report',
      icon: (
        <svg className="w-7 h-4" viewBox="0 0 28 16" fill="none">
          <path
            d="M 2 2 L 26 2 L 26 12 Q 20 16, 14 12 T 2 12 Z"
            className="fill-teal-950/60 stroke-teal-400 stroke-2"
          />
        </svg>
      ),
      defaultColor: '#0f2d3a',
      strokeColor: '#2dd4bf',
    },
    {
      type: 'multidocument',
      title: 'Multidocument',
      desc: 'Stacked documents: Multiple records',
      icon: (
        <svg className="w-7 h-4" viewBox="0 0 28 16" fill="none">
          <path d="M 6 1 L 27 1 L 27 9 Q 22 12, 17 9 T 6 9 Z" className="stroke-teal-400/50 stroke-1" />
          <path d="M 2 4 L 24 4 L 24 12 Q 18 16, 13 12 T 2 12 Z" className="fill-teal-950/70 stroke-teal-400 stroke-2" />
        </svg>
      ),
      defaultColor: '#132e35',
      strokeColor: '#14b8a6',
    },
    {
      type: 'predefined-process',
      title: 'Subprocess',
      desc: 'Double borders: Subroutine or external module',
      icon: (
        <svg className="w-7 h-4" viewBox="0 0 28 16" fill="none">
          <rect x="2" y="2" width="24" height="12" rx="2" className="fill-violet-950/60 stroke-violet-400 stroke-2" />
          <line x1="7" y1="2" x2="7" y2="14" className="stroke-violet-400 stroke-2" />
          <line x1="21" y1="2" x2="21" y2="14" className="stroke-violet-400 stroke-2" />
        </svg>
      ),
      defaultColor: '#231834',
      strokeColor: '#a855f7',
    },
    {
      type: 'connector',
      title: 'Connector (On-Page)',
      desc: 'Circle: Joiner node within same diagram',
      icon: (
        <div className="w-5 h-5 rounded-full border-2 border-slate-400 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-300">
          A
        </div>
      ),
      defaultColor: '#1e293b',
      strokeColor: '#94a3b8',
    },
    {
      type: 'offpage-connector',
      title: 'Off-Page Connector',
      desc: 'Pentagon: Links to external or next page',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
          <polygon
            points="2,2 18,2 18,12 10,18 2,12"
            className="fill-indigo-950/60 stroke-indigo-400 stroke-2"
          />
        </svg>
      ),
      defaultColor: '#1e1b4b',
      strokeColor: '#818cf8',
    },
    {
      type: 'manual-input',
      title: 'Manual Input',
      desc: 'Sloped trapezoid: User keyboard or form input',
      icon: (
        <svg className="w-7 h-4" viewBox="0 0 28 16" fill="none">
          <polygon
            points="2,5 26,2 26,14 2,14"
            className="fill-rose-950/60 stroke-rose-400 stroke-2"
          />
        </svg>
      ),
      defaultColor: '#2a1720',
      strokeColor: '#fb7185',
    },
    {
      type: 'manual-operation',
      title: 'Manual Operation',
      desc: 'Inverted trapezoid: Manual physical step',
      icon: (
        <svg className="w-7 h-4" viewBox="0 0 28 16" fill="none">
          <polygon
            points="2,2 26,2 21,14 7,14"
            className="fill-amber-950/60 stroke-amber-400 stroke-2"
          />
        </svg>
      ),
      defaultColor: '#2e1c14',
      strokeColor: '#fb923c',
    },
    {
      type: 'preparation',
      title: 'Preparation',
      desc: 'Hexagon: Variable setup / initialization',
      icon: (
        <svg className="w-7 h-4" viewBox="0 0 28 16" fill="none">
          <polygon
            points="2,8 6,2 22,2 26,8 22,14 6,14"
            className="fill-emerald-950/60 stroke-emerald-400 stroke-2"
          />
        </svg>
      ),
      defaultColor: '#172e26',
      strokeColor: '#34d399',
    },
    {
      type: 'delay',
      title: 'Delay',
      desc: 'D-shape: System waiting period or timeout',
      icon: (
        <div className="w-7 h-4 rounded-r-full border-2 border-orange-400 bg-orange-950/60" />
      ),
      defaultColor: '#2a1e17',
      strokeColor: '#fb923c',
    },
    {
      type: 'database',
      title: 'Database',
      desc: 'Cylinder: Storage or SQL data repository',
      icon: <Database className="w-5 h-5 text-indigo-400" />,
      defaultColor: '#1a1f38',
      strokeColor: '#818cf8',
    },
    {
      type: 'display',
      title: 'Display',
      desc: 'Monitor: Output display or screen interface',
      icon: (
        <svg className="w-7 h-4" viewBox="0 0 28 16" fill="none">
          <path
            d="M 4 2 L 23 2 Q 27 8, 23 14 L 4 14 L 2 8 Z"
            className="fill-sky-950/60 stroke-sky-400 stroke-2"
          />
        </svg>
      ),
      defaultColor: '#14273e',
      strokeColor: '#38bdf8',
    },
  ];

  const dataShapes: ShapeItemDef[] = [
    {
      type: 'cloud',
      title: 'Cloud / API Webhook',
      desc: 'External microservice or cloud API',
      icon: <Cloud className="w-5 h-5 text-sky-400" />,
      defaultColor: '#0c2e3a',
      strokeColor: '#0ea5e9',
    },
    {
      type: 'note',
      title: 'Sticky Note / Annotation',
      desc: 'Helpful documentation note or callout',
      icon: <StickyNote className="w-5 h-5 text-yellow-400" />,
      defaultColor: '#292524',
      strokeColor: '#eab308',
    },
  ];

  const handleDragStart = (e: React.DragEvent, type: ShapeType) => {
    e.dataTransfer.setData('application/flowchart-shape', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (isCollapsed) {
    return (
      <aside className="w-10 sm:w-12 bg-slate-900/95 border-r border-slate-800 flex flex-col items-center py-3 select-none text-slate-400 z-30 transition-all shrink-0">
        <button
          onClick={handleToggle}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors shadow-sm"
          title="Buka Toolbox Shapes (Expand)"
        >
          <Boxes className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>
        <span className="mt-4 [writing-mode:vertical-lr] text-[9px] uppercase font-bold tracking-widest text-slate-500 select-none hidden sm:block">
          Toolbox
        </span>
      </aside>
    );
  }

  return (
    <aside
      id="left-tool-sidebar"
      className="fixed md:relative top-14 md:top-0 left-0 bottom-0 md:bottom-auto w-64 sm:w-72 md:w-60 lg:w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] select-none text-slate-300 z-40 md:z-30 backdrop-blur-md transition-all shrink-0 shadow-2xl md:shadow-none animate-in slide-in-from-left duration-200"
    >
      {/* Sidebar Header with Close button */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Toolbox & Shapes
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
          title="Tutup Toolbox Shapes (Collapse)"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[10px] hidden sm:inline">Tutup</span>
        </button>
      </div>
      {/* Connector Style Selector */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Line Style
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">Auto Route</span>
        </div>

        <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onChangeConnectorType('orthogonal')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded text-[9px] font-medium transition-colors ${
              activeConnectorType === 'orthogonal'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Orthogonal (90° Right Angle)"
          >
            <GitFork className="w-3.5 h-3.5 rotate-90" />
            <span>90° Step</span>
          </button>

          <button
            onClick={() => onChangeConnectorType('smooth-step')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded text-[9px] font-medium transition-colors ${
              activeConnectorType === 'smooth-step'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Smooth Rounded Corners"
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Smooth</span>
          </button>

          <button
            onClick={() => onChangeConnectorType('curved')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded text-[9px] font-medium transition-colors ${
              activeConnectorType === 'curved'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Smooth Bézier Curve"
          >
            <Spline className="w-3.5 h-3.5" />
            <span>Curved</span>
          </button>

          <button
            onClick={() => onChangeConnectorType('straight')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded text-[9px] font-medium transition-colors ${
              activeConnectorType === 'straight'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Direct Straight Line"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Straight</span>
          </button>
        </div>
      </div>

      {/* Shapes Palette (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
        {/* Section 1: Standard Flowchart */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Standard Shapes</span>
            <span className="text-[9px] text-slate-500">Drag / Click</span>
          </div>

          <div className="space-y-1.5">
            {standardShapes.map((shape) => (
              <div
                key={shape.type}
                draggable
                onDragStart={(e) => handleDragStart(e, shape.type)}
                onClick={() => onAddShape(shape.type)}
                className="group flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/50 cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
                title="Drag onto canvas or click to place"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/40">
                    {shape.icon}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {shape.title}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">
                      {shape.desc}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-1 text-cyan-400 hover:bg-cyan-950/50 rounded transition-opacity"
                  title="Add to center of canvas"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Data & Cloud */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Data & Services</span>
            <span className="text-[9px] text-slate-500">Drag / Click</span>
          </div>

          <div className="space-y-1.5">
            {dataShapes.map((shape) => (
              <div
                key={shape.type}
                draggable
                onDragStart={(e) => handleDragStart(e, shape.type)}
                onClick={() => onAddShape(shape.type)}
                className="group flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/50 cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
                title="Drag onto canvas or click to place"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/40">
                    {shape.icon}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {shape.title}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">
                      {shape.desc}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-1 text-cyan-400 hover:bg-cyan-950/50 rounded transition-opacity"
                  title="Add to center of canvas"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Help Tip */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Smart Auto Connect</span>
        </div>
        <p className="leading-tight text-slate-400 text-[10px]">
          Hover over any port circle on a node's border, then drag a line to another node to connect them.
        </p>
      </div>
    </aside>
  );
};
