import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Settings,
  Code2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Zap,
  GripHorizontal,
  Copy,
  Check,
  Download,
  Wand2,
  Brain,
} from 'lucide-react';
import { LLMConfig, FlowNode, FlowConnector } from '../types';

// Streaming Text Component with TypeWriter Effect
const StreamingText: React.FC<{ text: string }> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 15); // Speed: 15ms per character (fast like ChatGPT)
      
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <>
      {displayedText}
      {currentIndex < text.length && (
        <span className="inline-block w-1 h-3 bg-cyan-400 animate-pulse ml-0.5" />
      )}
    </>
  );
};

interface CanvasAIChatBarProps {
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  llmConfig: LLMConfig;
  onOpenLLMSettings: () => void;
  onOpenCodeEditor: () => void;
  nodeCount: number;
  connectorCount: number;
  isOpen?: boolean;
  onClose?: () => void;
  chatMessages?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    flowchartCode?: string;
    timestamp: number;
  }>;
  onApplyFlowchart?: (code: string) => void;
}

const QUICK_PROMPTS = [
  'User Registration & Email OTP Verification',
  'Employee Leave Approval Workflow',
  'E-Commerce Checkout & Payment Gateway',
  'Customer Support Ticket Resolution Lifecycle',
];

export const CanvasAIChatBar: React.FC<CanvasAIChatBarProps> = ({
  onGenerate,
  isGenerating,
  llmConfig,
  onOpenLLMSettings,
  onOpenCodeEditor,
  nodeCount,
  connectorCount,
  isOpen = true,
  onClose,
  chatMessages = [],
  onApplyFlowchart,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastGeneratedStatus, setLastGeneratedStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // --- Drag logic ---
  const barRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  // Set initial centered position after first render
  useEffect(() => {
    if (position === null && barRef.current) {
      const w = barRef.current.offsetWidth || 600;
      setPosition({ x: Math.max(8, (window.innerWidth - w) / 2), y: 68 });
    }
  });

  const handleDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (!barRef.current) return;
    e.preventDefault();
    const rect = barRef.current.getBoundingClientRect();
    dragOrigin.current = { mx: e.clientX, my: e.clientY, bx: rect.left, by: rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current || !barRef.current) return;
    const dx = e.clientX - dragOrigin.current.mx;
    const dy = e.clientY - dragOrigin.current.my;
    const newX = dragOrigin.current.bx + dx;
    const newY = dragOrigin.current.by + dy;
    const maxX = window.innerWidth - barRef.current.offsetWidth - 8;
    const maxY = window.innerHeight - 60;
    setPosition({ x: Math.max(8, Math.min(newX, maxX)), y: Math.max(8, Math.min(newY, maxY)) });
  }, []);

  const handleDragEnd = useCallback(() => { dragOrigin.current = null; }, []);

  const getProviderLabel = () => {
    switch (llmConfig.provider) {
      case 'custom_local': return `Local (${llmConfig.customEndpoint || '127.0.0.1:8088'})`;
      case 'gemini':       return `Gemini (${llmConfig.geminiModel || '2.5-flash'})`;
      case 'openai':       return `OpenAI (${llmConfig.openaiModel || 'gpt-4o-mini'})`;
      case 'claude':       return `Claude (${llmConfig.claudeModel || 'sonnet-4-5'})`;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isGenerating) return;
    setErrorMessage(null);
    setLastGeneratedStatus(null);
    setStreamingText('');
    setIsStreaming(true);
    
    try {
      await onGenerate(cleanPrompt);
      setLastGeneratedStatus('Flowchart generated & synced!');
      setPrompt('');
      setIsStreaming(false);
      setTimeout(() => setLastGeneratedStatus(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate flowchart.');
      setIsStreaming(false);
    }
  };

  const handleCopyCode = useCallback((code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const handleApplyToCanvas = useCallback((code: string) => {
    if (onApplyFlowchart) {
      onApplyFlowchart(code);
      setLastGeneratedStatus('Applied to canvas!');
      setTimeout(() => setLastGeneratedStatus(null), 3000);
    }
  }, [onApplyFlowchart]);

  const posStyle: React.CSSProperties = position !== null
    ? { position: 'fixed', left: position.x, top: position.y, transform: 'none' }
    : { position: 'fixed', top: 68, left: '50%', transform: 'translateX(-50%)' };

  if (!isOpen) return null;

  return (
    <div
      ref={barRef}
      id="canvas-ai-chat-bar"
      style={posStyle}
      className="z-40 w-[95vw] sm:w-[90vw] max-w-3xl pointer-events-none animate-in fade-in slide-in-from-top-3"
    >
      <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden ring-1 ring-white/10">
        {/* Error banner */}
        {errorMessage && (
          <div className="px-4 py-2 bg-rose-950/90 border-b border-rose-800/60 text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="line-clamp-2">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white text-xs underline shrink-0 ml-2">Tutup</button>
          </div>
        )}

        {/* Success banner */}
        {lastGeneratedStatus && (
          <div className="px-4 py-1.5 bg-emerald-950/90 border-b border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
              <span className="font-medium">{lastGeneratedStatus}</span>
            </div>
            <span className="text-[10px] bg-emerald-900/80 px-2 py-0.5 rounded text-emerald-200">Auto-Saved</span>
          </div>
        )}

        {/* ── DRAG HANDLE HEADER ── */}
        <div
          className="px-3 sm:px-4 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between text-xs gap-2 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          title="Drag to reposition"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <GripHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />

            <div className="flex items-center gap-1.5 font-semibold text-slate-200 shrink-0">
              <Wand2 className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="hidden xs:inline">AI Flowchart Generator</span>
              <span className="xs:hidden">AI Flow</span>
            </div>

            {/* Provider Pill */}
            <button
              onClick={onOpenLLMSettings}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/20 transition-colors truncate max-w-[140px] sm:max-w-[200px]"
              title="Configure AI models"
            >
              <Brain className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">{getProviderLabel()}</span>
              <Settings className="w-2.5 h-2.5 text-slate-400 ml-0.5 shrink-0" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={onOpenCodeEditor}
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 transition-colors"
              title="Open FlowScript Code Editor"
            >
              <Code2 className="w-3 h-3 text-indigo-400" />
              <span>View Code</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
              title={isExpanded ? 'Kecilkan' : 'Perbesar'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-500 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors ml-0.5"
                title="Sembunyikan"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── BODY ── */}
        {isExpanded && (
          <div className="p-3 space-y-2.5">
            {/* Chat Messages History */}
            {chatMessages.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                {chatMessages.slice(-5).map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-lg border ${
                      msg.role === 'user'
                        ? 'bg-slate-800/80 border-slate-700 ml-8'
                        : 'bg-cyan-950/40 border-cyan-800/40 mr-8'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {msg.role === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200 whitespace-pre-wrap">{msg.content}</div>
                    
                    {/* Flowchart Code Block dengan Copy & Apply */}
                    {msg.flowchartCode && (
                      <div className="mt-2 bg-slate-950/80 border border-slate-700 rounded-lg overflow-hidden">
                        <div className="px-2 py-1 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-cyan-400">FlowScript DSL</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopyCode(msg.flowchartCode!, msg.id)}
                              className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                              title="Copy code"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {onApplyFlowchart && (
                              <button
                                onClick={() => handleApplyToCanvas(msg.flowchartCode!)}
                                className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded flex items-center gap-1 transition-colors"
                                title="Apply to canvas"
                              >
                                <Download className="w-3 h-3" />
                                Apply
                              </button>
                            )}
                          </div>
                        </div>
                        <pre className="p-2 text-[10px] text-slate-300 overflow-x-auto max-h-40 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                          <code>{msg.flowchartCode}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Streaming AI Response */}
                {isStreaming && (
                  <div className="p-2.5 rounded-lg border bg-cyan-950/40 border-cyan-800/40 mr-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        AI Assistant
                      </span>
                      <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                    </div>
                    <div className="text-xs text-slate-200 whitespace-pre-wrap">
                      {chatMessages[chatMessages.length - 1]?.role === 'assistant' 
                        ? <StreamingText text={chatMessages[chatMessages.length - 1].content} />
                        : 'Thinking...'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Prompt Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
              <span className="text-slate-500 text-[10px] uppercase font-bold shrink-0 flex items-center gap-1 mr-1">
                <Zap className="w-3 h-3 text-amber-400" /> Examples:
              </span>
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(qp)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 shrink-0 transition-all text-left"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  placeholder="Describe any workflow, algorithm, or process..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all disabled:opacity-60"
                />
                {prompt && !isGenerating && (
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                  >✕</button>
                )}
              </div>

              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shrink-0 ${
                  isGenerating
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/50 cursor-wait'
                    : prompt.trim()
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/40 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin text-cyan-400" /><span>Generating...</span></>
                ) : (
                  <><Sparkles className="w-4 h-4 text-cyan-200" /><span className="hidden sm:inline">Generate</span><Send className="w-3.5 h-3.5 sm:hidden" /></>
                )}
              </button>
            </form>

            {/* Footer info */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Auto-generates, syncs to code editor &amp; auto-saves
              </span>
              <span>
                Diagram: <strong className="text-slate-400">{nodeCount}</strong> nodes,{' '}
                <strong className="text-slate-400">{connectorCount}</strong> connectors
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
