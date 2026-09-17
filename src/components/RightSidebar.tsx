import React from 'react';
import {
  FlowNode,
  FlowConnector,
  ShapeType,
  ConnectorType,
  CanvasState,
  StylePreset,
} from '../types';
import {
  Palette,
  Sliders,
  Type,
  Trash2,
  Copy,
  Sparkles,
  ArrowRight,
  GitCommit,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize,
  Minimize,
  Compass,
  Layers,
  Activity,
  ArrowLeftRight,
  CircleDot,
  Spline,
  GitFork,
  Minus,
  CornerDownRight,
  Tag,
  Check,
  Zap,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Rows,
  Columns,
  Scaling,
  MessageSquare,
  Bot,
  Send,
  Loader2,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { StylePresetLibrary } from './StylePresetLibrary';
import { DetailAIPanel } from './DetailAIPanel';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import { chatWithFlowchartBot, BotChatMessage } from '../utils/llmService';
import { sanitizeMarkdown } from '../utils/textFormatter';
import { diagramToDSL, dslToDiagram, ParseResult } from '../utils/codeSync';
import { LLMConfig } from '../types';

interface RightSidebarProps {
  selectedNode: FlowNode | null;
  selectedNodes?: FlowNode[];
  selectedNodeIds?: string[];
  selectedConnector: FlowConnector | null;
  canvasState: CanvasState;
  onUpdateNode: (nodeId: string, updates: Partial<FlowNode>) => void;
  onUpdateNodes?: (nodeIds: string[], updates: Partial<FlowNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteNodes?: (nodeIds: string[]) => void;
  onDuplicateNode: (nodeId: string) => void;
  onScaleNodes?: (nodeIds: string[], factor: number) => void;
  onAlignNodes?: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistributeNodes?: (direction: 'horizontal' | 'vertical') => void;
  onApplyStylePreset?: (preset: StylePreset) => void;
  onUpdateConnector: (connId: string, updates: Partial<FlowConnector>) => void;
  onDeleteConnector: (connId: string) => void;
  onDuplicateConnector?: (connId: string) => void;
  onUpdateCanvasState: (updates: Partial<CanvasState>) => void;
  nodeCount: number;
  connectorCount: number;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onClose?: () => void;
  llmConfig?: LLMConfig;
  allNodes?: FlowNode[];
  allConnectors?: FlowConnector[];
  onApplyGeneratedCode?: (newNodes: FlowNode[], newConnectors: FlowConnector[]) => void;
  projectName?: string;
  currentTab?: 'properties' | 'chat' | 'detail_ai';
  onTabChange?: (tab: 'properties' | 'chat' | 'detail_ai') => void;
}

const COLOR_PRESETS = [
  { fill: '#0f2b1d', stroke: '#10b981', label: 'Emerald Dark' },
  { fill: '#0f2d3a', stroke: '#06b6d4', label: 'Cyan Teal' },
  { fill: '#172554', stroke: '#38bdf8', label: 'Sky Blue' },
  { fill: '#1e1b4b', stroke: '#818cf8', label: 'Indigo Night' },
  { fill: '#281b3d', stroke: '#c084fc', label: 'Violet Glow' },
  { fill: '#331627', stroke: '#f43f5e', label: 'Rose Dark' },
  { fill: '#2a2012', stroke: '#f59e0b', label: 'Amber Warm' },
  { fill: '#1e293b', stroke: '#94a3b8', label: 'Slate Gray' },
  { fill: '#090d16', stroke: '#334155', label: 'Deep Charcoal' },
];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedNode,
  selectedNodes = [],
  selectedNodeIds = [],
  selectedConnector,
  canvasState,
  onUpdateNode,
  onUpdateNodes,
  onDeleteNode,
  onDeleteNodes,
  onDuplicateNode,
  onScaleNodes,
  onAlignNodes,
  onDistributeNodes,
  onApplyStylePreset,
  onUpdateConnector,
  onDeleteConnector,
  onDuplicateConnector,
  onUpdateCanvasState,
  nodeCount,
  connectorCount,
  isOpen,
  onToggleOpen,
  onClose,
  llmConfig,
  allNodes = [],
  allConnectors = [],
  onApplyGeneratedCode,
  projectName = 'Interactive Flowchart Studio',
  currentTab,
  onTabChange,
}) => {
  const [internalCollapsed, setInternalCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  const [internalTab, setInternalTab] = React.useState<'properties' | 'chat' | 'detail_ai'>(
    currentTab || 'properties'
  );

  React.useEffect(() => {
    if (currentTab) {
      setInternalTab(currentTab);
    }
  }, [currentTab]);

  const activeTab = currentTab !== undefined ? currentTab : internalTab;
  const setActiveTab = (tab: 'properties' | 'chat' | 'detail_ai') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // AI Chat Bot state
  const [chatMessages, setChatMessages] = React.useState<BotChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content:
        'FlowBot siap. Tanya tentang diagram ini, minta saran perbaikan, atau ketik perintah untuk membuat/mengubah alur.',
      timestamp: Date.now(),
    },
  ]);
  const [chatInput, setChatInput] = React.useState('');
  const [isChatLoading, setIsChatLoading] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [applySuccessStatus, setApplySuccessStatus] = React.useState<string | null>(null);

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

  const handleSendChatMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || chatInput).trim();
    if (!textToSend || isChatLoading) return;

    setChatError(null);
    setApplySuccessStatus(null);

    const userMsg: BotChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setIsChatLoading(true);

    try {
      const currentDSL = diagramToDSL(allNodes, allConnectors);
      const config = llmConfig || {
        provider: 'custom_local',
        geminiApiKey: '',
        geminiModel: 'gemini-2.5-flash',
        openaiApiKey: '',
        openaiModel: 'gpt-4o-mini',
        openaiBaseUrl: 'https://api.openai.com/v1',
        claudeApiKey: '',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customEndpoint: 'http://127.0.0.1:8088/completion',
        customApiKey: '',
        customModel: 'local-model',
        temperature: 0.3,
      };

      const result = await chatWithFlowchartBot(textToSend, currentDSL, chatMessages, config);

      const botMsg: BotChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        timestamp: Date.now(),
        generatedDSL: result.generatedDSL,
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setChatError(err.message || 'Gagal menghubungi asisten bot AI.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleApplyGeneratedDSL = (dsl: string) => {
    try {
      const parsed: ParseResult = dslToDiagram(dsl);
      if (parsed.success && parsed.nodes && parsed.connectors && onApplyGeneratedCode) {
        onApplyGeneratedCode(parsed.nodes, parsed.connectors);
        setApplySuccessStatus('Alur flowchart berhasil diterapkan ke canvas!');
        setTimeout(() => setApplySuccessStatus(null), 4000);
      } else {
        setChatError(parsed.error || 'Gagal memproses kode FlowScript hasil AI.');
      }
    } catch (err: any) {
      setChatError(err.message || 'Terjadi kesalahan saat menerapkan diagram.');
    }
  };

  if (isCollapsed) {
    return (
      <aside className="w-10 sm:w-12 bg-slate-900/95 border-l border-slate-800 flex flex-col items-center py-3 select-none text-slate-400 z-30 transition-all shrink-0">
        <button
          onClick={handleToggle}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors shadow-sm"
          title="Buka Properties Inspector & AI Chat (Expand)"
        >
          <Sliders className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>
        <span className="mt-4 [writing-mode:vertical-lr] text-[9px] uppercase font-bold tracking-widest text-slate-500 select-none hidden sm:block">
          Properties
        </span>
      </aside>
    );
  }

  return (
    <aside
      id="right-inspector-panel"
      className="fixed md:relative top-14 md:top-0 right-0 bottom-0 md:bottom-auto w-72 sm:w-80 md:w-64 lg:w-72 bg-slate-900/95 border-l border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] select-none text-slate-300 z-40 md:z-30 backdrop-blur-md overflow-hidden shrink-0 shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200"
    >
      {/* Top Header with Tabs & Close button */}
      <div className="px-2.5 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between shrink-0 gap-1">
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'properties'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tampilkan Inspector Properties"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Properties</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'chat'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Chat dengan Asisten Bot AI"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Bot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </button>
          <button
            id="tab-detail-ai"
            onClick={() => setActiveTab('detail_ai')}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'detail_ai'
                ? 'bg-purple-950 text-purple-300 border border-purple-500/40 shadow-sm ring-1 ring-purple-500/30'
                : 'text-slate-400 hover:text-purple-300'
            }`}
            title="Detail AI: Analisis Khusus Membahas Project Canvas Ini"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Detail AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          </button>
        </div>

        <button
          onClick={handleClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
          title="Tutup Inspector Panel (Collapse)"
        >
          <ChevronRight className="w-4 h-4" />
          <span className="text-[10px] hidden sm:inline">Tutup</span>
        </button>
      </div>

      {/* Main Panel Content (Tab 1: Properties, Tab 2: AI Bot Chat) */}
      {activeTab === 'chat' ? (
        /* AI BOT CHAT VIEW */
        <div className="flex-1 flex flex-col h-[calc(100%-48px)] bg-slate-950/40 overflow-hidden">
          {/* Status Banners */}
          {chatError && (
            <div className="px-3 py-1.5 bg-rose-950/90 border-b border-rose-800/60 text-rose-300 text-xs flex items-center justify-between gap-1 shrink-0">
              <span className="line-clamp-2">{chatError}</span>
              <button onClick={() => setChatError(null)} className="text-rose-400 underline text-[10px]">
                ✕
              </button>
            </div>
          )}
          {applySuccessStatus && (
            <div className="px-3 py-1.5 bg-emerald-950/90 border-b border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between gap-1 shrink-0">
              <span>{applySuccessStatus}</span>
              <button onClick={() => setApplySuccessStatus(null)} className="text-emerald-400 text-[10px]">
                ✕
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {msg.role === 'assistant' ? (
                    <>
                      <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-[10px]">
                        <Bot className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-[10px] font-semibold text-cyan-400">Flowchart Bot</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">Anda</span>
                  )}
                  <span className="text-[9px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`p-2.5 rounded-2xl text-xs leading-relaxed max-w-[92%] break-words ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-xs shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{sanitizeMarkdown(msg.content)}</div>

                  {/* Generated DSL Apply Card */}
                  {msg.generatedDSL && (
                    <div className="mt-2.5 pt-2 border-t border-cyan-500/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-cyan-300 uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          Alur Siap Diterapkan
                        </span>
                      </div>
                      <button
                        onClick={() => handleApplyGeneratedDSL(msg.generatedDSL!)}
                        className="w-full py-1.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                        <span>Terapkan ke Canvas</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
              {[
                'Jelaskan alur ini',
                'Tambah error handling',
                'Optimalkan alur',
                'Buat alur login',
              ].map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChatMessage(qp)}
                  disabled={isChatLoading}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/30 whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-900 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading}
                placeholder="Tanya atau minta perubahan alur..."
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className={`p-2 rounded-xl text-white transition-all shadow-md shrink-0 ${
                  chatInput.trim() && !isChatLoading
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
                title="Kirim pesan ke bot"
              >
                {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      ) : activeTab === 'detail_ai' ? (
        /* DETAIL AI CANVAS PROJECT CONSULTANT VIEW - NEW UNIFIED PANEL */
        <AIAnalysisPanel
          projectName={projectName}
          nodes={allNodes}
          connectors={allConnectors}
          llmConfig={llmConfig}
          isOpen={activeTab === 'detail_ai'}
        />
      ) : (
        /* PROPERTIES INSPECTOR VIEW */
        <div className="flex-1 overflow-y-auto custom-scrollbar">
      {/* 0. MULTI-NODE INSPECTOR (When 2+ nodes selected) */}
      {selectedNodes.length > 1 ? (
        <div className="p-4 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider block">
                  Multi-Selection
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {selectedNodes.length} nodes selected
                </span>
              </div>
            </div>
            {onDeleteNodes && (
              <button
                onClick={() => onDeleteNodes(selectedNodes.map((n) => n.id))}
                className="p-1.5 rounded hover:bg-rose-950/60 text-rose-400 transition-colors flex items-center gap-1 text-xs"
                title="Delete Selected Nodes (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Alignment Tools (Draw.io precision) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">
                Align Nodes
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Precision</span>
            </div>

            {/* Horizontal Alignments */}
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => onAlignNodes?.('left')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors"
                title="Align Left"
              >
                <AlignStartVertical className="w-4 h-4 text-cyan-400" />
                <span>Left</span>
              </button>
              <button
                onClick={() => onAlignNodes?.('center')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors"
                title="Align Horizontal Center"
              >
                <AlignCenterVertical className="w-4 h-4 text-cyan-400" />
                <span>Center</span>
              </button>
              <button
                onClick={() => onAlignNodes?.('right')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors"
                title="Align Right"
              >
                <AlignEndVertical className="w-4 h-4 text-cyan-400" />
                <span>Right</span>
              </button>
              <button
                onClick={() => onDistributeNodes?.('horizontal')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors"
                title="Distribute Horizontally"
              >
                <Columns className="w-4 h-4 text-cyan-400" />
                <span>Dist. H</span>
              </button>
            </div>

            {/* Vertical Alignments */}
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => onAlignNodes?.('top')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors"
                title="Align Top"
              >
                <AlignStartHorizontal className="w-4 h-4 text-indigo-400" />
                <span>Top</span>
              </button>
              <button
                onClick={() => onAlignNodes?.('middle')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors"
                title="Align Vertical Middle"
              >
                <AlignCenterHorizontal className="w-4 h-4 text-indigo-400" />
                <span>Middle</span>
              </button>
              <button
                onClick={() => onAlignNodes?.('bottom')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors"
                title="Align Bottom"
              >
                <AlignEndHorizontal className="w-4 h-4 text-indigo-400" />
                <span>Bottom</span>
              </button>
              <button
                onClick={() => onDistributeNodes?.('vertical')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors"
                title="Distribute Vertically"
              >
                <Rows className="w-4 h-4 text-indigo-400" />
                <span>Dist. V</span>
              </button>
            </div>
          </div>

          {/* Multi-Node Quick Scale */}
          {onScaleNodes && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">
                  Batch Scale
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {selectedNodes.length} items
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { factor: 0.8, label: '-20%' },
                  { factor: 0.9, label: '-10%' },
                  { factor: 1.1, label: '+10%' },
                  { factor: 1.2, label: '+20%' },
                ].map((sc) => (
                  <button
                    key={sc.label}
                    onClick={() =>
                      onScaleNodes(
                        selectedNodes.map((n) => n.id),
                        sc.factor
                      )
                    }
                    className="py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/60 text-slate-300 hover:text-amber-300 text-xs font-mono font-semibold transition-colors flex items-center justify-center"
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multi-Node Style Presets Library */}
          <StylePresetLibrary
            selectedNode={selectedNodes[0] || null}
            selectedNodeIds={selectedNodes.map((n) => n.id)}
            onApplyPreset={(preset) => {
              if (onApplyStylePreset) {
                onApplyStylePreset(preset);
              } else if (onUpdateNodes) {
                onUpdateNodes(
                  selectedNodes.map((n) => n.id),
                  preset
                );
              }
            }}
          />

          {/* Batch Delete Button */}
          {onDeleteNodes && (
            <div className="pt-2">
              <button
                onClick={() => onDeleteNodes(selectedNodes.map((n) => n.id))}
                className="w-full py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-700/60 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {selectedNodes.length} Nodes</span>
              </button>
            </div>
          )}
        </div>
      ) : selectedNode ? (
        /* 1. SINGLE NODE INSPECTOR */
        <div className="p-4 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Shape Properties
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDuplicateNode(selectedNode.id)}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Duplicate Node (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteNode(selectedNode.id)}
                className="p-1.5 rounded hover:bg-rose-950/60 text-rose-400 transition-colors"
                title="Delete Node (Del)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Node Type Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
              Shape Type
            </label>
            <select
              value={selectedNode.type}
              onChange={(e) =>
                onUpdateNode(selectedNode.id, {
                  type: e.target.value as ShapeType,
                })
              }
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
            >
              <option value="terminator">Terminator (Start / End)</option>
              <option value="process">Process (Rectangle)</option>
              <option value="decision">Decision (Diamond)</option>
              <option value="input-output">Input / Output (Parallelogram)</option>
              <option value="database">Database (Cylinder)</option>
              <option value="document">Document (Wavy Base)</option>
              <option value="multidocument">Multidocument (Stack)</option>
              <option value="predefined-process">Subprocess (Predefined)</option>
              <option value="cloud">Cloud / Webhook</option>
              <option value="delay">Delay (Timeout)</option>
              <option value="manual-input">Manual Input</option>
              <option value="manual-operation">Manual Operation</option>
              <option value="preparation">Preparation (Hexagon)</option>
              <option value="display">Display (Monitor)</option>
              <option value="note">Sticky Note</option>
            </select>
          </div>

          {/* Label and Sublabel */}
          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Primary Title
              </label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, { label: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
                placeholder="Title text..."
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Sub-description (Optional)
              </label>
              <input
                type="text"
                value={selectedNode.subLabel || ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, { subLabel: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-cyan-500"
                placeholder="Process details..."
              />
            </div>
          </div>

          {/* Color Palettes (Dark Neon Theme) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-slate-400">
                Shape Color Theme
              </label>
              <span className="text-[10px] text-slate-500">Pro Presets</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {COLOR_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    onUpdateNode(selectedNode.id, {
                      fillColor: p.fill,
                      strokeColor: p.stroke,
                    })
                  }
                  className={`h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                    selectedNode.fillColor === p.fill &&
                    selectedNode.strokeColor === p.stroke
                      ? 'ring-2 ring-cyan-400 scale-105'
                      : 'hover:scale-102'
                  }`}
                  style={{
                    backgroundColor: p.fill,
                    borderColor: p.stroke,
                  }}
                  title={p.label}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.stroke }}
                  />
                </button>
              ))}
            </div>

            {/* Custom Hex Color Pickers */}
            <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">
                  Fill Color
                </span>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded border border-slate-700/80">
                  <input
                    type="color"
                    value={selectedNode.fillColor}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, { fillColor: e.target.value })
                    }
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[10px] font-mono uppercase text-slate-300">
                    {selectedNode.fillColor}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">
                  Border Color
                </span>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded border border-slate-700/80">
                  <input
                    type="color"
                    value={selectedNode.strokeColor}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, { strokeColor: e.target.value })
                    }
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[10px] font-mono uppercase text-slate-300">
                    {selectedNode.strokeColor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stroke Width and Style */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400">
                Border Width
              </label>
              <span className="text-xs font-mono text-cyan-400">
                {selectedNode.strokeWidth}px
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((sw) => (
                <button
                  key={sw}
                  onClick={() =>
                    onUpdateNode(selectedNode.id, { strokeWidth: sw })
                  }
                  className={`py-1 rounded text-xs font-semibold border transition-colors ${
                    selectedNode.strokeWidth === sw
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sw}px
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="text-[11px] font-semibold text-slate-400">
                Border Pattern
              </label>
              <div className="flex gap-1">
                {(['solid', 'dashed'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() =>
                      onUpdateNode(selectedNode.id, { strokeStyle: style })
                    }
                    className={`px-2 py-0.5 rounded text-[10px] capitalize border transition-colors ${
                      selectedNode.strokeStyle === style
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Glow / Shadow Atmosphere */}
          <div className="pt-2 border-t border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Glow Aura Effect</span>
            </label>
            <select
              value={selectedNode.shadow}
              onChange={(e) =>
                onUpdateNode(selectedNode.id, {
                  shadow: e.target.value as any,
                })
              }
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
            >
              <option value="none">Flat (No Effect)</option>
              <option value="subtle">Subtle Shadow</option>
              <option value="glow-cyan">Neon Cyan Glow</option>
              <option value="glow-emerald">Neon Emerald Glow</option>
              <option value="glow-violet">Cyber Violet Glow</option>
              <option value="glow-amber">Amber Neon Glow</option>
            </select>
          </div>

          {/* Node Dimensions (Width & Height) */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-400">
                Shape Dimensions
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                {selectedNode.width} × {selectedNode.height} px
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">
                  Width (W)
                </span>
                <input
                  type="number"
                  min="100"
                  max="400"
                  step="10"
                  value={selectedNode.width}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      width: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">
                  Height (H)
                </span>
                <input
                  type="number"
                  min="45"
                  max="200"
                  step="5"
                  value={selectedNode.height}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      height: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Typography Controls */}
          <div className="pt-2 border-t border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-blue-400" />
              <span>Typography</span>
            </label>
            <div className="flex items-center justify-between gap-1">
              {/* Text Align */}
              <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800">
                <button
                  onClick={() =>
                    onUpdateNode(selectedNode.id, { textAlign: 'left' })
                  }
                  className={`p-1 rounded ${
                    selectedNode.textAlign === 'left'
                      ? 'bg-slate-800 text-cyan-400'
                      : 'text-slate-400'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    onUpdateNode(selectedNode.id, { textAlign: 'center' })
                  }
                  className={`p-1 rounded ${
                    selectedNode.textAlign === 'center'
                      ? 'bg-slate-800 text-cyan-400'
                      : 'text-slate-400'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    onUpdateNode(selectedNode.id, { textAlign: 'right' })
                  }
                  className={`p-1 rounded ${
                    selectedNode.textAlign === 'right'
                      ? 'bg-slate-800 text-cyan-400'
                      : 'text-slate-400'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bold toggle */}
              <button
                onClick={() =>
                  onUpdateNode(selectedNode.id, {
                    fontWeight:
                      selectedNode.fontWeight === 'bold' ? 'medium' : 'bold',
                  })
                }
                className={`px-2 py-1 rounded text-xs font-bold border ${
                  selectedNode.fontWeight === 'bold'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
                title="Bold Toggle"
              >
                B
              </button>

              {/* Font size */}
              <select
                value={selectedNode.fontSize}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    fontSize: Number(e.target.value),
                  })
                }
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none"
              >
                {[11, 12, 13, 14, 15, 16, 18].map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Style Presets Library */}
          <StylePresetLibrary
            selectedNode={selectedNode}
            selectedNodeIds={selectedNodeIds.length > 0 ? selectedNodeIds : [selectedNode.id]}
            onApplyPreset={(preset) => {
              if (onApplyStylePreset) {
                onApplyStylePreset(preset);
              } else {
                onUpdateNode(selectedNode.id, preset);
              }
            }}
          />
        </div>
      ) : selectedConnector ? (
        /* 2. COMPLETE CONNECTOR INSPECTOR */
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Connector Line
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onDuplicateConnector && (
                <button
                  onClick={() => onDuplicateConnector(selectedConnector.id)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                  title="Duplicate Line"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() =>
                  onUpdateConnector(selectedConnector.id, {
                    fromNodeId: selectedConnector.toNodeId,
                    fromPort: selectedConnector.toPort,
                    toNodeId: selectedConnector.fromNodeId,
                    toPort: selectedConnector.fromPort,
                  })
                }
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                title="Reverse Direction (A ⇄ B)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteConnector(selectedConnector.id)}
                className="p-1.5 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                title="Delete Line"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Connector Routing Type (4 Options) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
              Routing Style
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <button
                onClick={() =>
                  onUpdateConnector(selectedConnector.id, { type: 'orthogonal' })
                }
                className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedConnector.type === 'orthogonal'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitFork className="w-3.5 h-3.5 rotate-90 shrink-0 text-cyan-400" />
                <span>90° Step</span>
              </button>
              <button
                onClick={() =>
                  onUpdateConnector(selectedConnector.id, { type: 'smooth-step' })
                }
                className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedConnector.type === 'smooth-step'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CircleDot className="w-3.5 h-3.5 shrink-0 text-teal-400" />
                <span>Smooth</span>
              </button>
              <button
                onClick={() =>
                  onUpdateConnector(selectedConnector.id, { type: 'curved' })
                }
                className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedConnector.type === 'curved'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Spline className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                <span>Bézier</span>
              </button>
              <button
                onClick={() =>
                  onUpdateConnector(selectedConnector.id, { type: 'straight' })
                }
                className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedConnector.type === 'straight'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Minus className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <span>Straight</span>
              </button>
            </div>
          </div>

          {/* Curvature Slider (When Curved) */}
          {selectedConnector.type === 'curved' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Curvature Intensity
                </label>
                <span className="text-xs font-mono text-cyan-400">
                  {Math.round((selectedConnector.curvature ?? 0.35) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.85"
                step="0.05"
                value={selectedConnector.curvature ?? 0.35}
                onChange={(e) =>
                  onUpdateConnector(selectedConnector.id, {
                    curvature: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Connection Ports (From / To) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 block">
              Connection Ports
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">From Port:</span>
                <select
                  value={selectedConnector.fromPort}
                  onChange={(e) =>
                    onUpdateConnector(selectedConnector.id, {
                      fromPort: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500 capitalize"
                >
                  <option value="top">Top</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-1">To Port:</span>
                <select
                  value={selectedConnector.toPort}
                  onChange={(e) =>
                    onUpdateConnector(selectedConnector.id, {
                      toPort: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500 capitalize"
                >
                  <option value="top">Top</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                </select>
              </div>
            </div>
          </div>

          {/* Arrowheads Style */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 block">
              Arrowhead Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">End Point (To):</span>
                <select
                  value={selectedConnector.arrowEndType || (selectedConnector.arrowEnd ? 'arrow' : 'none')}
                  onChange={(e) =>
                    onUpdateConnector(selectedConnector.id, {
                      arrowEnd: e.target.value !== 'none',
                      arrowEndType: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="arrow">Arrow (Sharp)</option>
                  <option value="triangle">Solid Triangle</option>
                  <option value="circle">Circle Dot</option>
                  <option value="diamond">Diamond</option>
                  <option value="none">None (Plain)</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Start Point (From):</span>
                <select
                  value={selectedConnector.arrowStartType || (selectedConnector.arrowStart ? 'arrow' : 'none')}
                  onChange={(e) =>
                    onUpdateConnector(selectedConnector.id, {
                      arrowStart: e.target.value !== 'none',
                      arrowStartType: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="none">None</option>
                  <option value="arrow">Arrow (Sharp)</option>
                  <option value="triangle">Solid Triangle</option>
                  <option value="circle">Circle Dot</option>
                  <option value="diamond">Diamond</option>
                </select>
              </div>
            </div>
          </div>

          {/* Connector Color & Quick Presets */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400">
                Line Color
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={selectedConnector.strokeColor}
                  onChange={(e) =>
                    onUpdateConnector(selectedConnector.id, {
                      strokeColor: e.target.value,
                    })
                  }
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-mono uppercase text-cyan-300">
                  {selectedConnector.strokeColor}
                </span>
              </div>
            </div>

            {/* Quick Color Palette */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[
                { color: '#38bdf8', label: 'Sky' },
                { color: '#06b6d4', label: 'Cyan' },
                { color: '#10b981', label: 'Emerald' },
                { color: '#f59e0b', label: 'Amber' },
                { color: '#f43f5e', label: 'Rose' },
                { color: '#a855f7', label: 'Violet' },
                { color: '#f8fafc', label: 'White' },
                { color: '#64748b', label: 'Slate' },
              ].map((p) => (
                <button
                  key={p.color}
                  onClick={() =>
                    onUpdateConnector(selectedConnector.id, {
                      strokeColor: p.color,
                    })
                  }
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border ${
                    selectedConnector.strokeColor.toLowerCase() === p.color.toLowerCase()
                      ? 'bg-slate-800 border-cyan-400 text-slate-100 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-400">
                Line Width
              </label>
              <span className="text-xs font-mono text-cyan-400">
                {selectedConnector.strokeWidth}px
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 6].map((w) => (
                <button
                  key={w}
                  onClick={() =>
                    onUpdateConnector(selectedConnector.id, { strokeWidth: w })
                  }
                  className={`py-1 rounded text-xs font-semibold border ${
                    selectedConnector.strokeWidth === w
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>

          {/* Stroke Style */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
              Line Pattern
            </label>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'solid', label: 'Solid' },
                { id: 'dashed', label: 'Dashed' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() =>
                    onUpdateConnector(selectedConnector.id, {
                      strokeStyle: st.id as any,
                    })
                  }
                  className={`py-1 text-[10px] font-semibold rounded border ${
                    selectedConnector.strokeStyle === st.id
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Neon Glow Aura */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Neon Glow Aura</span>
            </label>
            <div className="grid grid-cols-5 gap-1">
              {[
                { id: 'none', label: 'None' },
                { id: 'cyan', label: 'Cyan' },
                { id: 'emerald', label: 'Green' },
                { id: 'violet', label: 'Violet' },
                { id: 'amber', label: 'Amber' },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() =>
                    onUpdateConnector(selectedConnector.id, {
                      glow: g.id as any,
                    })
                  }
                  className={`py-1 text-[10px] font-semibold rounded border ${
                    (selectedConnector.glow || 'none') === g.id
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Animation Modes */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-semibold text-slate-300">
                  Electric Flow Pulse
                </span>
              </div>
              <button
                onClick={() =>
                  onUpdateConnector(selectedConnector.id, {
                    animated: !selectedConnector.animated,
                  })
                }
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                  selectedConnector.animated
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500'
                    : 'bg-slate-950 text-slate-500 border border-slate-800'
                }`}
              >
                {selectedConnector.animated ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Connector Label & Presets */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400">
                Logic / Branch Label
              </label>
              {selectedConnector.label && (
                <button
                  onClick={() =>
                    onUpdateConnector(selectedConnector.id, { label: '' })
                  }
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="text"
              value={selectedConnector.label || ''}
              onChange={(e) =>
                onUpdateConnector(selectedConnector.id, {
                  label: e.target.value,
                })
              }
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
              placeholder="e.g. Yes, No, Success, Error..."
            />

            {/* Quick Label Preset Badges */}
            <div className="flex flex-wrap gap-1 pt-1">
              {['Yes', 'No', 'Success', 'Failed', 'True', 'False', 'Timeout', 'Retry'].map((txt) => (
                <button
                  key={txt}
                  onClick={() =>
                    onUpdateConnector(selectedConnector.id, { label: txt })
                  }
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  {txt}
                </button>
              ))}
            </div>

            {/* Label font size */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500">Label Font Size:</span>
              <div className="flex gap-1">
                {[10, 11, 12, 14].map((sz) => (
                  <button
                    key={sz}
                    onClick={() =>
                      onUpdateConnector(selectedConnector.id, {
                        labelFontSize: sz,
                      })
                    }
                    className={`px-1.5 py-0.5 text-[10px] rounded border ${
                      (selectedConnector.labelFontSize || 11) === sz
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {sz}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 3. CANVAS OVERVIEW INSPECTOR (When nothing is selected) */
        <div className="p-4 space-y-5">
          <div className="pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Canvas Properties
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Select any shape or line to customize its colors, ports, routing, and typography.
            </p>
          </div>

          {/* AI Flowchart Bot Launcher Card */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-950/60 via-slate-900 to-indigo-950/40 border border-cyan-500/35 space-y-2.5 shadow-lg shadow-cyan-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-100 block">AI Flowchart Bot</span>
                  <span className="text-[10px] text-cyan-400 font-medium">Asisten Alur & Logika</span>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-semibold">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Chat langsung dengan bot untuk menganalisis diagram ini, meminta saran optimasi, atau membuat alur baru otomatis.
            </p>
            <button
              onClick={() => setActiveTab('chat')}
              className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat dengan Bot AI</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Total Nodes</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">
                {nodeCount}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">
                Total Connectors
              </span>
              <span className="text-lg font-bold text-indigo-400 font-mono">
                {connectorCount}
              </span>
            </div>
          </div>

          {/* Grid Settings */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 block">
              Grid Spacing
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[16, 24, 32].map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateCanvasState({ gridSize: size })}
                  className={`py-1.5 rounded text-xs font-mono font-medium border ${
                    canvasState.gridSize === size
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Shortcuts Guide */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Keyboard Shortcuts
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Pan Canvas</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-200">
                  Space + Drag / Scroll
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Delete Element</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-200">
                  Delete / Backspace
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Duplicate Node</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-200">
                  Ctrl + D
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Undo / Redo</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-200">
                  Ctrl + Z / Ctrl + Y
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Inline Edit Label</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-200">
                  Double Click
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Marquee Select</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-200">
                  Click + Drag Canvas
                </kbd>
              </div>
            </div>
          </div>

          {/* Style Presets Library */}
          <div className="pt-2 border-t border-slate-800">
            <StylePresetLibrary
              selectedNode={null}
              selectedNodeIds={[]}
              onApplyPreset={onApplyStylePreset || (() => {})}
            />
          </div>
        </div>
      )}
        </div>
      )}
    </aside>
  );
};
