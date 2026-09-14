import React, { useState, useEffect } from 'react';
import {
  X,
  Shapes,
  Sparkles,
  Palette,
  Sliders,
  Plus,
  Trash2,
  Check,
  Send,
  Loader2,
  Wand2,
  Bookmark,
  Layers,
  Shield,
  Star,
  Triangle,
  Database,
  Cloud,
  MessageSquare,
  Award,
  CircleDot,
  Boxes,
} from 'lucide-react';
import { FlowNode, ShapeType } from '../types';

interface CustomShapesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShape: (shapeData: Partial<FlowNode>) => void;
}

interface SavedCustomShape {
  id: string;
  name: string;
  type: ShapeType;
  width: number;
  height: number;
  label: string;
  subLabel?: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed';
  textColor: string;
  fontSize: number;
  fontWeight: 'normal' | 'medium' | 'bold';
  rounded: number;
  shadow: 'none' | 'subtle' | 'glow-cyan' | 'glow-emerald' | 'glow-violet' | 'glow-amber';
  customIcon?: string;
}

const STORAGE_KEY = 'flowchart_custom_shapes_library_v1';

const COLOR_PRESETS = [
  { name: 'Cyan Pro', fill: '#0c2436', stroke: '#38bdf8', glow: 'glow-cyan' },
  { name: 'Emerald Safe', fill: '#0a2a1d', stroke: '#10b981', glow: 'glow-emerald' },
  { name: 'Violet AI', fill: '#24143a', stroke: '#a855f7', glow: 'glow-violet' },
  { name: 'Amber Alert', fill: '#2b1e0f', stroke: '#f59e0b', glow: 'glow-amber' },
  { name: 'Rose Critical', fill: '#2e1219', stroke: '#f43f5e', glow: 'none' },
  { name: 'Indigo Core', fill: '#141c38', stroke: '#6366f1', glow: 'glow-cyan' },
  { name: 'Slate Dark', fill: '#1e293b', stroke: '#94a3b8', glow: 'subtle' },
  { name: 'Deep Midnight', fill: '#090d16', stroke: '#38bdf8', glow: 'glow-cyan' },
];

const EMOJI_ICONS = ['⚡', '🛡️', '🔒', '🚀', '📦', '🌐', '💾', '🎯', '⚙️', '🔑', '📊', '🤖', '💡', '🔍', '⭐', '✨'];

export const CustomShapesModal: React.FC<CustomShapesModalProps> = ({
  isOpen,
  onClose,
  onAddShape,
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'custom' | 'generator'>('gallery');

  // --- Tab 2: Custom Shape Builder State ---
  const [customType, setCustomType] = useState<ShapeType>('hexagon');
  const [customLabel, setCustomLabel] = useState('Custom Element');
  const [customSubLabel, setCustomSubLabel] = useState('Spesifikasi Kustom');
  const [customWidth, setCustomWidth] = useState(180);
  const [customHeight, setCustomHeight] = useState(72);
  const [customFill, setCustomFill] = useState('#0c2436');
  const [customStroke, setCustomStroke] = useState('#38bdf8');
  const [customStrokeWidth, setCustomStrokeWidth] = useState(2);
  const [customStrokeStyle, setCustomStrokeStyle] = useState<'solid' | 'dashed'>('solid');
  const [customShadow, setCustomShadow] = useState<any>('glow-cyan');
  const [customRounded, setCustomRounded] = useState(12);
  const [customIcon, setCustomIcon] = useState('⚙️');

  // --- Saved Custom Shapes ---
  const [savedShapes, setSavedShapes] = useState<SavedCustomShape[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // --- Tab 3: AI Shape Generator State ---
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<Partial<FlowNode> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedShapes));
    } catch {}
  }, [savedShapes]);

  if (!isOpen) return null;

  // Handle saving custom shape to library
  const handleSaveToLibrary = () => {
    const newShape: SavedCustomShape = {
      id: `custom-shape-${Date.now()}`,
      name: customLabel || 'Bentuk Kustom',
      type: customType,
      width: customWidth,
      height: customHeight,
      label: customLabel,
      subLabel: customSubLabel,
      fillColor: customFill,
      strokeColor: customStroke,
      strokeWidth: customStrokeWidth,
      strokeStyle: customStrokeStyle,
      textColor: '#f8fafc',
      fontSize: 13,
      fontWeight: 'bold',
      rounded: customRounded,
      shadow: customShadow,
      customIcon: customIcon || undefined,
    };
    setSavedShapes((prev) => [newShape, ...prev]);
  };

  const handleDeleteSaved = (id: string) => {
    setSavedShapes((prev) => prev.filter((s) => s.id !== id));
  };

  // Add custom shape to canvas
  const handleAddCustomToCanvas = () => {
    onAddShape({
      type: customType,
      width: customWidth,
      height: customHeight,
      label: customLabel || 'Bentuk Kustom',
      subLabel: customSubLabel,
      fillColor: customFill,
      strokeColor: customStroke,
      strokeWidth: customStrokeWidth,
      strokeStyle: customStrokeStyle,
      textColor: '#f8fafc',
      fontSize: 13,
      fontWeight: 'bold',
      rounded: customRounded,
      shadow: customShadow,
      customIcon: customIcon || undefined,
    });
    onClose();
  };

  // Handle AI shape generation
  const handleGenerateShapeWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);

    // Simulate intelligent NLP synthesis based on prompt keywords
    setTimeout(() => {
      const p = aiPrompt.toLowerCase();

      let genType: ShapeType = 'hexagon';
      let genFill = '#0c2436';
      let genStroke = '#38bdf8';
      let genGlow: any = 'glow-cyan';
      let genIcon = '✨';
      let genLabel = aiPrompt.slice(0, 24);
      let genSub = 'Custom Shape';
      let genW = 190;
      let genH = 76;

      if (p.includes('shield') || p.includes('keamanan') || p.includes('security') || p.includes('firewall') || p.includes('auth')) {
        genType = 'shield';
        genFill = '#0a2a1d';
        genStroke = '#10b981';
        genGlow = 'glow-emerald';
        genIcon = '🛡️';
        genLabel = 'Security Enclave';
        genSub = 'Shield & Firewall Rule';
      } else if (p.includes('database') || p.includes('data') || p.includes('storage') || p.includes('silinder') || p.includes('cluster')) {
        genType = 'cylinder';
        genFill = '#172554';
        genStroke = '#60a5fa';
        genGlow = 'glow-cyan';
        genIcon = '💾';
        genLabel = 'Data Lake Cluster';
        genSub = 'Persistent Replica Set';
      } else if (p.includes('star') || p.includes('bintang') || p.includes('milestone') || p.includes('goal') || p.includes('kpi') || p.includes('target')) {
        genType = 'star';
        genFill = '#2b1e0f';
        genStroke = '#f59e0b';
        genGlow = 'glow-amber';
        genIcon = '⭐';
        genLabel = 'Milestone Reached';
        genSub = 'Target KPI Accomplished';
        genW = 160;
        genH = 120;
      } else if (p.includes('cloud') || p.includes('awan') || p.includes('api') || p.includes('gateway') || p.includes('network') || p.includes('microservice')) {
        genType = 'cloud-service';
        genFill = '#1c1b3d';
        genStroke = '#818cf8';
        genGlow = 'glow-violet';
        genIcon = '🌐';
        genLabel = 'API Gateway VPC';
        genSub = 'Edge Microservice';
      } else if (p.includes('warning') || p.includes('bahaya') || p.includes('alert') || p.includes('danger') || p.includes('segitiga') || p.includes('triangle')) {
        genType = 'triangle';
        genFill = '#2e1219';
        genStroke = '#f43f5e';
        genGlow = 'glow-amber';
        genIcon = '⚠️';
        genLabel = 'Incident Alert';
        genSub = 'High Severity Checkpoint';
        genW = 180;
        genH = 90;
      } else if (p.includes('callout') || p.includes('pesan') || p.includes('chat') || p.includes('komentar') || p.includes('note')) {
        genType = 'callout';
        genFill = '#1e293b';
        genStroke = '#38bdf8';
        genGlow = 'subtle';
        genIcon = '💬';
        genLabel = 'User Feedback Callout';
        genSub = 'Contextual Notation';
      } else if (p.includes('badge') || p.includes('sertifikat') || p.includes('verifikasi') || p.includes('approved')) {
        genType = 'badge';
        genFill = '#0f2b1d';
        genStroke = '#34d399';
        genGlow = 'glow-emerald';
        genIcon = '🏆';
        genLabel = 'Audit Approved';
        genSub = 'SOC2 / ISO Verified';
      }

      // If user specified colors in prompt
      if (p.includes('hijau') || p.includes('green') || p.includes('emerald')) {
        genFill = '#0a2a1d';
        genStroke = '#10b981';
        genGlow = 'glow-emerald';
      } else if (p.includes('ungu') || p.includes('purple') || p.includes('violet')) {
        genFill = '#24143a';
        genStroke = '#a855f7';
        genGlow = 'glow-violet';
      } else if (p.includes('merah') || p.includes('red') || p.includes('rose')) {
        genFill = '#2e1219';
        genStroke = '#f43f5e';
      } else if (p.includes('kuning') || p.includes('amber') || p.includes('orange')) {
        genFill = '#2b1e0f';
        genStroke = '#f59e0b';
        genGlow = 'glow-amber';
      }

      const generated: Partial<FlowNode> = {
        type: genType,
        width: genW,
        height: genH,
        label: genLabel,
        subLabel: genSub,
        fillColor: genFill,
        strokeColor: genStroke,
        strokeWidth: 2.5,
        strokeStyle: 'solid',
        textColor: '#ffffff',
        fontSize: 13,
        fontWeight: 'bold',
        rounded: 12,
        shadow: genGlow,
        customIcon: genIcon,
      };

      setGeneratedPreview(generated);
      setIsGenerating(false);
    }, 600);
  };

  // Preview renderer
  const renderPreviewSvg = (type: ShapeType, w: number, h: number, fill: string, stroke: string, width: number, style: string) => {
    const strokeDash = style === 'dashed' ? '5,4' : 'none';

    switch (type) {
      case 'hexagon': {
        const inset = Math.min(24, Math.round(w * 0.16));
        return (
          <polygon
            points={`${inset},2 ${w - inset},2 ${w - 2},${h / 2} ${w - inset},${h - 2} ${inset},${h - 2} 2,${h / 2}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={strokeDash}
          />
        );
      }
      case 'shield': {
        const d = `M 2,8 Q ${w / 2},0 ${w - 2},8 L ${w - 2},${h * 0.58} Q ${w - 2},${h - 2} ${w / 2},${h - 2} Q 2,${h - 2} 2,${h * 0.58} Z`;
        return (
          <path
            d={d}
            fill={fill}
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={strokeDash}
          />
        );
      }
      case 'star': {
        const cx = w / 2;
        const cy = h / 2;
        const outerR = Math.min(w, h) / 2 - 2;
        const innerR = outerR * 0.48;
        const pts: string[] = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return (
          <polygon
            points={pts.join(' ')}
            fill={fill}
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={strokeDash}
          />
        );
      }
      case 'triangle':
        return (
          <polygon
            points={`${w / 2},3 ${w - 3},${h - 3} 3,${h - 3}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={strokeDash}
          />
        );
      case 'cylinder': {
        const rh = Math.min(16, h * 0.2);
        return (
          <g>
            <path
              d={`M 2,${rh} L 2,${h - rh} A ${w / 2 - 2} ${rh} 0 0 0 ${w - 2} ${h - rh} L ${w - 2},${rh} Z`}
              fill={fill}
              stroke={stroke}
              strokeWidth={width}
              strokeDasharray={strokeDash}
            />
            <ellipse
              cx={w / 2}
              cy={rh}
              rx={w / 2 - 2}
              ry={rh - 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={width}
            />
          </g>
        );
      }
      case 'callout': {
        const tailW = 14;
        const tailH = 10;
        return (
          <path
            d={`M 8,2 L ${w - 8},2 Q ${w - 2},2 ${w - 2},8 L ${w - 2},${h - tailH - 8} Q ${w - 2},${h - tailH} ${w - 8},${h - tailH} L ${w / 2 + tailW},${h - tailH} L ${w / 2},${h - 2} L ${w / 2 - tailW},${h - tailH} L 8,${h - tailH} Q 2,${h - tailH} 2,${h - tailH - 8} L 2,8 Q 2,2 8,2 Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={strokeDash}
          />
        );
      }
      case 'badge': {
        const notch = 12;
        return (
          <polygon
            points={`2,2 ${w - 2},2 ${w - notch},${h / 2} ${w - 2},${h - 2} 2,${h - 2} ${notch},${h / 2}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={strokeDash}
          />
        );
      }
      case 'cloud-service': {
        return (
          <path
            d={`M 14,${h - 8} A 10,10 0 0,1 18,${h * 0.4} A 18,18 0 0,1 ${w * 0.45},10 A 18,18 0 0,1 ${w - 18},${h * 0.35} A 12,12 0 0,1 ${w - 8},${h - 8} Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={strokeDash}
          />
        );
      }
      default:
        return (
          <rect
            x="2"
            y="2"
            width={w - 4}
            height={h - 4}
            rx={customRounded || 8}
            ry={customRounded || 8}
            fill={fill}
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={strokeDash}
          />
        );
    }
  };

  // Gallery predefined catalog
  const GALLERY_SHAPES = [
    {
      type: 'hexagon' as ShapeType,
      title: 'Hexagon Preparation',
      desc: 'Blok inisialisasi, setup loop, konfigurasi parameter',
      icon: <HexagonIcon className="w-5 h-5 text-cyan-400" />,
      width: 190,
      height: 72,
      fill: '#0c2436',
      stroke: '#38bdf8',
      glow: 'glow-cyan',
      customIcon: '⚙️',
    },
    {
      type: 'shield' as ShapeType,
      title: 'Security Shield',
      desc: 'Firewall, enkripsi data, otentikasi IAM & compliance',
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      width: 180,
      height: 80,
      fill: '#0a2a1d',
      stroke: '#10b981',
      glow: 'glow-emerald',
      customIcon: '🛡️',
    },
    {
      type: 'star' as ShapeType,
      title: 'Milestone & KPI',
      desc: 'Pencapaian target, rilis milestone, goal utama',
      icon: <Star className="w-5 h-5 text-amber-400" />,
      width: 160,
      height: 110,
      fill: '#2b1e0f',
      stroke: '#f59e0b',
      glow: 'glow-amber',
      customIcon: '⭐',
    },
    {
      type: 'triangle' as ShapeType,
      title: 'Hazard & Alert',
      desc: 'Titik peringatan kritis, fallback failover, emergency',
      icon: <Triangle className="w-5 h-5 text-rose-400" />,
      width: 180,
      height: 84,
      fill: '#2e1219',
      stroke: '#f43f5e',
      glow: 'glow-amber',
      customIcon: '⚠️',
    },
    {
      type: 'cylinder' as ShapeType,
      title: 'Database Cluster',
      desc: 'Penyimpanan terdistribusi, data lake, message broker',
      icon: <Database className="w-5 h-5 text-blue-400" />,
      width: 180,
      height: 80,
      fill: '#172554',
      stroke: '#60a5fa',
      glow: 'glow-cyan',
      customIcon: '💾',
    },
    {
      type: 'cloud-service' as ShapeType,
      title: 'Cloud Service VPC',
      desc: 'Layanan cloud computing, container cluster, CDN',
      icon: <Cloud className="w-5 h-5 text-indigo-400" />,
      width: 190,
      height: 76,
      fill: '#1c1b3d',
      stroke: '#818cf8',
      glow: 'glow-violet',
      customIcon: '🌐',
    },
    {
      type: 'callout' as ShapeType,
      title: 'Speech Callout',
      desc: 'Catatan interaktif, bubble anotasi, dialog sistem',
      icon: <MessageSquare className="w-5 h-5 text-cyan-300" />,
      width: 190,
      height: 78,
      fill: '#1e293b',
      stroke: '#38bdf8',
      glow: 'subtle',
      customIcon: '💬',
    },
    {
      type: 'badge' as ShapeType,
      title: 'Verified Badge',
      desc: 'Validasi audit selesai, status sertifikasi approval',
      icon: <Award className="w-5 h-5 text-teal-400" />,
      width: 180,
      height: 68,
      fill: '#0f2d3a',
      stroke: '#2dd4bf',
      glow: 'glow-emerald',
      customIcon: '🏆',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Shapes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Studio Bentuk & Custom Shapes</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                  Pro Studio
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pilih bentuk lainnya, desain bentuk kustom sendiri, atau generate bentuk cerdas dengan AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Tutup Studio Bentuk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
              activeTab === 'gallery'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Boxes className="w-4 h-4 text-cyan-400" />
            <span>1. Galeri Bentuk Lainnya</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
              {GALLERY_SHAPES.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
              activeTab === 'custom'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>2. Custom Bentuk Builder</span>
            {savedShapes.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-mono border border-amber-500/30">
                {savedShapes.length} tersimpan
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
              activeTab === 'generator'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>3. Bentuk Otomatis</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-500/30">
              Smart
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: GALERI BENTUK LAINNYA */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Katalog bentuk flowchart & arsitektur sistem tingkat lanjut. Klik bentuk untuk langsung memasangnya ke tengah canvas:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {GALLERY_SHAPES.map((item) => (
                  <div
                    key={item.type}
                    onClick={() => {
                      onAddShape({
                        type: item.type,
                        width: item.width,
                        height: item.height,
                        label: item.title,
                        subLabel: item.desc.split(',')[0],
                        fillColor: item.fill,
                        strokeColor: item.stroke,
                        strokeWidth: 2,
                        strokeStyle: 'solid',
                        textColor: '#ffffff',
                        fontSize: 13,
                        fontWeight: 'bold',
                        rounded: 10,
                        shadow: item.glow as any,
                        customIcon: item.customIcon,
                      });
                      onClose();
                    }}
                    className="group p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-850 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between"
                  >
                    <div>
                      {/* Mini Preview Graphic */}
                      <div className="h-20 w-full rounded-lg bg-[#090d16] flex items-center justify-center p-2 mb-3 border border-slate-800/80 group-hover:border-cyan-500/40 transition-colors relative overflow-hidden">
                        <svg className="w-full h-full max-h-16" viewBox={`0 0 ${item.width} ${item.height}`}>
                          {renderPreviewSvg(item.type, item.width, item.height, item.fill, item.stroke, 2, 'solid')}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
                          <span className="text-xs">{item.customIcon}</span>
                          <span className="text-[10px] font-bold text-white truncate max-w-[80px]">
                            {item.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        {item.icon}
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>

                    <button className="mt-3 w-full py-1.5 rounded-lg bg-slate-800 group-hover:bg-cyan-600 text-slate-300 group-hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Pasang ke Canvas</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM BENTUK BUILDER */}
          {activeTab === 'custom' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Base Geometry Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    1. Geometri Dasar Bentuk
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'hexagon', name: 'Hexagon' },
                      { id: 'shield', name: 'Shield' },
                      { id: 'star', name: 'Star' },
                      { id: 'triangle', name: 'Triangle' },
                      { id: 'cylinder', name: 'Cylinder' },
                      { id: 'cloud-service', name: 'Cloud' },
                      { id: 'callout', name: 'Callout' },
                      { id: 'badge', name: 'Badge' },
                      { id: 'process', name: 'Rectangle' },
                      { id: 'decision', name: 'Diamond' },
                      { id: 'input-output', name: 'Parallelogram' },
                      { id: 'terminator', name: 'Capsule' },
                    ].map((geom) => (
                      <button
                        key={geom.id}
                        type="button"
                        onClick={() => setCustomType(geom.id as ShapeType)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left truncate ${
                          customType === geom.id
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {geom.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Text Labels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Label Judul
                    </label>
                    <input
                      type="text"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                      placeholder="Nama Elemen..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Sub-Label Deskripsi
                    </label>
                    <input
                      type="text"
                      value={customSubLabel}
                      onChange={(e) => setCustomSubLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-cyan-500"
                      placeholder="Keterangan singkat..."
                    />
                  </div>
                </div>

                {/* 3. Dimensions */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Lebar (Width): <span className="text-cyan-400 font-mono">{customWidth}px</span>
                    </label>
                    <input
                      type="range"
                      min="90"
                      max="320"
                      step="10"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tinggi (Height): <span className="text-cyan-400 font-mono">{customHeight}px</span>
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="180"
                      step="5"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                {/* 4. Color Palettes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Warna & Tema Cepat
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setCustomFill(preset.fill);
                          setCustomStroke(preset.stroke);
                          setCustomShadow(preset.glow);
                        }}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-all ${
                          customStroke === preset.stroke
                            ? 'bg-slate-800 border-cyan-400 text-white shadow-sm'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border"
                          style={{ backgroundColor: preset.fill, borderColor: preset.stroke }}
                        />
                        <span className="truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Custom Stroke & Icon */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Garis Tepi (Border)
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={customStrokeStyle}
                        onChange={(e) => setCustomStrokeStyle(e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none flex-1"
                      >
                        <option value="solid">Solid (Garis Penuh)</option>
                        <option value="dashed">Dashed (Putus-Putus)</option>
                      </select>
                      <input
                        type="color"
                        value={customStroke}
                        onChange={(e) => setCustomStroke(e.target.value)}
                        className="w-8 h-8 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                        title="Pilih Warna Garis"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Ikon Elemen
                    </label>
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                      {EMOJI_ICONS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setCustomIcon(em)}
                          className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center shrink-0 transition-all ${
                            customIcon === em
                              ? 'bg-cyan-950 border border-cyan-400 scale-110 shadow-sm'
                              : 'bg-slate-950/60 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview & Save Actions */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Live Preview</span>
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                      {customWidth} × {customHeight} px
                    </span>
                  </div>

                  {/* Interactive Preview Canvas Box */}
                  <div className="h-44 w-full rounded-xl bg-[#090d16] border border-slate-800 flex items-center justify-center p-4 relative overflow-hidden shadow-inner">
                    <div
                      className="relative flex items-center justify-center select-none transition-all"
                      style={{
                        width: `${customWidth}px`,
                        height: `${customHeight}px`,
                      }}
                    >
                      <svg
                        className="w-full h-full absolute inset-0 pointer-events-none"
                        viewBox={`0 0 ${customWidth} ${customHeight}`}
                      >
                        {renderPreviewSvg(
                          customType,
                          customWidth,
                          customHeight,
                          customFill,
                          customStroke,
                          customStrokeWidth,
                          customStrokeStyle
                        )}
                      </svg>

                      <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
                        {customIcon && (
                          <span className="text-base select-none mb-0.5 leading-none">{customIcon}</span>
                        )}
                        <span className="font-bold text-xs text-white truncate max-w-full leading-tight">
                          {customLabel || 'Preview Shape'}
                        </span>
                        {customSubLabel && (
                          <span className="text-[10px] text-slate-300 opacity-80 truncate max-w-full mt-0.5 leading-snug">
                            {customSubLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={handleAddCustomToCanvas}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambahkan ke Canvas Sekarang</span>
                  </button>

                  <button
                    onClick={handleSaveToLibrary}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simpan ke Library Bentuk Kustom</span>
                  </button>
                </div>

                {/* Saved Custom Shapes List */}
                {savedShapes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Bentuk Tersimpan ({savedShapes.length})
                    </span>
                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                      {savedShapes.map((shape) => (
                        <div
                          key={shape.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs hover:border-cyan-500/50 transition-colors"
                        >
                          <div
                            onClick={() => {
                              onAddShape(shape);
                              onClose();
                            }}
                            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                          >
                            <span className="text-sm">{shape.customIcon || '📦'}</span>
                            <span className="font-semibold text-white truncate">{shape.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({shape.type})</span>
                          </div>
                          <button
                            onClick={() => handleDeleteSaved(shape.id)}
                            className="p-1 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 ml-2"
                            title="Hapus bentuk tersimpan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AI SHAPE GENERATOR */}
          {activeTab === 'generator' && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div>
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>AI Bentuk Generator (Text to Shape)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Tulis deskripsi bentuk yang Anda inginkan dalam bahasa Indonesia atau Inggris. AI akan secara otomatis menentukan geometri, warna gradien, border, ikon, dan label yang paling pas.
                </p>
              </div>

              {/* Prompt Input Box */}
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerateShapeWithAI()}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
                    placeholder="Contoh: Shield keamanan hijau neon dengan border tebal untuk firewall..."
                  />
                  <button
                    onClick={handleGenerateShapeWithAI}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="absolute right-3 bottom-3 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menganalisis...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Generate Bentuk</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Inspiration Prompts */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Inspirasi Cepat (Klik untuk mencoba):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '🛡️ Firewall Security Shield hijau neon',
                      '💾 Data Lake Storage silinder biru',
                      '⭐ Milestone Target KPI bintang emas',
                      '🌐 Edge API Gateway VPC awan ungu',
                      '⚠️ Critical Incident Alert segitiga merah',
                      '💬 User Chat Callout bubble cyan',
                      '🏆 SOC2 Verified Badge emerald',
                    ].map((sample) => (
                      <button
                        key={sample}
                        onClick={() => {
                          setAiPrompt(sample);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generated Result Preview */}
              {generatedPreview && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/50 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Bentuk Berhasil Di-Generate!</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Geometri: {generatedPreview.type}
                    </span>
                  </div>

                  {/* Render result */}
                  <div className="h-36 w-full rounded-xl bg-[#090d16] flex items-center justify-center p-3 mb-3 border border-slate-800">
                    <div
                      className="relative flex items-center justify-center"
                      style={{
                        width: `${generatedPreview.width}px`,
                        height: `${generatedPreview.height}px`,
                      }}
                    >
                      <svg
                        className="w-full h-full absolute inset-0 pointer-events-none"
                        viewBox={`0 0 ${generatedPreview.width} ${generatedPreview.height}`}
                      >
                        {renderPreviewSvg(
                          generatedPreview.type!,
                          generatedPreview.width!,
                          generatedPreview.height!,
                          generatedPreview.fillColor!,
                          generatedPreview.strokeColor!,
                          generatedPreview.strokeWidth!,
                          generatedPreview.strokeStyle!
                        )}
                      </svg>
                      <div className="relative z-10 flex flex-col items-center justify-center px-3 text-center">
                        {generatedPreview.customIcon && (
                          <span className="text-sm select-none mb-0.5">{generatedPreview.customIcon}</span>
                        )}
                        <span className="font-bold text-xs text-white truncate max-w-full">
                          {generatedPreview.label}
                        </span>
                        {generatedPreview.subLabel && (
                          <span className="text-[10px] text-slate-300 opacity-80 truncate max-w-full">
                            {generatedPreview.subLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onAddShape(generatedPreview);
                        onClose();
                      }}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambahkan Bentuk Ini ke Canvas</span>
                    </button>

                    <button
                      onClick={() => {
                        const newSaved: SavedCustomShape = {
                          id: `ai-shape-${Date.now()}`,
                          name: generatedPreview.label || 'AI Shape',
                          type: generatedPreview.type!,
                          width: generatedPreview.width!,
                          height: generatedPreview.height!,
                          label: generatedPreview.label || '',
                          subLabel: generatedPreview.subLabel,
                          fillColor: generatedPreview.fillColor!,
                          strokeColor: generatedPreview.strokeColor!,
                          strokeWidth: generatedPreview.strokeWidth!,
                          strokeStyle: generatedPreview.strokeStyle!,
                          textColor: generatedPreview.textColor || '#ffffff',
                          fontSize: 13,
                          fontWeight: 'bold',
                          rounded: generatedPreview.rounded || 10,
                          shadow: generatedPreview.shadow as any,
                          customIcon: generatedPreview.customIcon,
                        };
                        setSavedShapes((prev) => [newSaved, ...prev]);
                        setActiveTab('custom');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                      <span>Simpan ke Library</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Mini Hexagon Icon component for gallery
function HexagonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <polygon points="6,2 18,2 23,12 18,22 6,22 1,12" />
    </svg>
  );
}
