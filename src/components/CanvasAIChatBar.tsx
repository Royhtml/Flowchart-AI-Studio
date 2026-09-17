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
  Zap,
  GripHorizontal,
  Copy,
  Check,
  Download,
  Wand2,
  Brain,
  Flame,
} from 'lucide-react';
import { LLMConfig } from '../types';
import { chatWithFlowchartBot } from '../utils/llmService';


// 🎬 Streaming Text Animation
const StreamingTextAnimation: React.FC<{
  text: string;
  isLatest: boolean;
}> = ({ text, isLatest }) => {
  const [displayedChars, setDisplayedChars] = useState(isLatest ? 0 : text.length);
  const [completed, setCompleted] = useState(!isLatest);

  useEffect(() => {
    if (!isLatest) {
      setDisplayedChars(text.length);
      setCompleted(true);
      return;
    }

    setDisplayedChars(0);
    setCompleted(false);

    const interval = setInterval(() => {
      setDisplayedChars((prev) => {
        const next = Math.min(prev + 8, text.length);
        if (next >= text.length) {
          clearInterval(interval);
          setCompleted(true);
        }
        return next;
      });
    }, 12);

    return () => clearInterval(interval);
  }, [text, isLatest]);

  return (
    <div className="relative">
      <div className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed font-sans">
        {text.slice(0, displayedChars)}
        {!completed && (
          <span className="inline-block w-1 h-4 ml-1 rounded-[1px] bg-gradient-to-b from-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(34,197,234,0.8)] animate-pulse align-middle" />
        )}
      </div>
      {!completed && (
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-cyan-400/90 font-mono select-none">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
            LLM Streaming...
          </span>
          <button
            type="button"
            onClick={() => {
              setDisplayedChars(text.length);
              setCompleted(true);
            }}
            className="text-[10px] text-slate-400 hover:text-cyan-300 underline cursor-pointer"
          >
            Selesai
          </button>
        </div>
      )}
    </div>
  );
};

interface CanvasAIChatBarProps {
  onGenerate?: (prompt: string) => Promise<void>;
  isGenerating?: boolean;
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
    timestamp: number;
    generatedDSL?: string;
  }>;
  onApplyFlowchart?: (code: string) => void;
}

// AI Flow Recommendations - topics to ask LLM
const FLOW_RECOMMENDATIONS = [
  { icon: '🔐', label: 'Alur Login & OTP', prompt: 'Buatkan flowchart untuk alur login pengguna dengan autentikasi 2FA/OTP' },
  { icon: '🛒', label: 'E-commerce Checkout', prompt: 'Buatkan flowchart untuk proses checkout dan pembayaran e-commerce' },
  { icon: '📋', label: 'Approval Workflow', prompt: 'Buatkan flowchart untuk alur persetujuan dokumen / request' },
  { icon: '🔄', label: 'Data Sync Process', prompt: 'Buatkan flowchart untuk proses sinkronisasi data real-time' },
  { icon: '⚙️', label: 'API Integration', prompt: 'Buatkan flowchart untuk integrasi dengan external API' },
  { icon: '📊', label: 'Report Generation', prompt: 'Buatkan flowchart untuk proses generate laporan otomatis' },
];

export const CanvasAIChatBar: React.FC<CanvasAIChatBarProps> = ({
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
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState(chatMessages);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDSL, setExpandedDSL] = useState<string | null>(null);
  const [glowActive, setGlowActive] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Drag logic
  const barRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

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

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || prompt).trim();
    if (!query || isLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: query,
      timestamp: Date.now(),
    };

    try {
      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setPrompt('');
      setIsLoading(true);
      setErrorMessage(null);

      // Debug logging
      console.log('[CanvasAIChatBar] Sending message:', query);

      if (!llmConfig) {
        throw new Error('LLM configuration not available. Please configure LLM settings.');
      }

      const response = await chatWithFlowchartBot(query, '', messages, llmConfig);
      
      if (!response) {
        throw new Error('Empty response from LLM service');
      }

      console.log('[CanvasAIChatBar] Response received:', { 
        hasReply: !!response.reply,
        hasDSL: !!response.generatedDSL 
      });

      // Auto-apply generated DSL to canvas if it exists
      if (response.generatedDSL && onApplyFlowchart) {
        console.log('[CanvasAIChatBar] Applying DSL to canvas...');
        try {
          // Call with error handling
          onApplyFlowchart(response.generatedDSL);
          
          // NEW: Auto-open code editor
          setTimeout(() => {
            onOpenCodeEditor();
          }, 500);
          
          // NEW: Add glow animation to UI
          setGlowActive(true);
          setTimeout(() => setGlowActive(false), 2500);
          
          console.log('[CanvasAIChatBar] DSL applied successfully');
        } catch (dslErr) {
          console.error('[CanvasAIChatBar] Failed to apply DSL:', dslErr);
          // Don't show error - DSL was still generated, just couldn't apply
          // Let the error show in the next step
        }
      }
      
      const aiMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: response.reply || 'No response text available',
        timestamp: Date.now(),
        generatedDSL: response.generatedDSL,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLastStatus(response.generatedDSL ? '✓ Flowchart Applied' : 'Response received from LLM');
      setTimeout(() => setLastStatus(null), 3000);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to get response from LLM';
      console.error('[CanvasAIChatBar] Error in handleSendMessage:', err);
      setErrorMessage(errorMsg);
      
      // Add error message to chat for visibility
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant' as const,
        content: `❌ Error: ${errorMsg}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const posStyle: React.CSSProperties = position !== null
    ? { position: 'fixed', left: position.x, top: position.y, transform: 'none' }
    : { position: 'fixed', top: 68, left: '50%', transform: 'translateX(-50%)' };

  if (!isOpen) return null;

  return (
    <div
      ref={barRef}
      id="canvas-ai-flow-bar"
      style={posStyle}
      className="z-40 w-[95vw] sm:w-[90vw] max-w-3xl pointer-events-none animate-in fade-in slide-in-from-top-3"
    >
      <div className={`pointer-events-auto bg-slate-900/95 backdrop-blur-xl border rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden ring-1 ring-white/10 transition-all duration-300 ${
        glowActive ? 'border-cyan-400/80 shadow-2xl' : 'border-cyan-500/40 shadow-2xl'
      }`} style={glowActive ? {
        boxShadow: '0 0 40px rgba(34,197,234,0.9), 0 0 80px rgba(34,197,234,0.5), inset 0 0 20px rgba(34,197,234,0.2)'
      } : {}}>
        {/* Error banner */}
        {errorMessage && (
          <div className="px-4 py-2 bg-rose-950/90 border-b border-rose-800/60 text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="line-clamp-2">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white text-xs underline shrink-0">Tutup</button>
          </div>
        )}

        {/* Success banner */}
        {lastStatus && (
          <div className="px-4 py-1.5 bg-emerald-950/90 border-b border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
            <span className="font-medium">{lastStatus}</span>
          </div>
        )}

        {/* Header */}
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
              <span className="hidden xs:inline">AI Flow Generator</span>
              <span className="xs:hidden">AI Flow</span>
            </div>

            <button
              onClick={onOpenLLMSettings}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/20 transition-colors truncate max-w-[140px] sm:max-w-[200px]"
              title="Configure LLM Settings"
            >
              <Brain className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">Local LLM</span>
              <Settings className="w-2.5 h-2.5 text-slate-400 ml-0.5 shrink-0" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={onOpenCodeEditor}
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 transition-colors"
              title="Open Code Editor"
            >
              <Code2 className="w-3 h-3 text-cyan-400" />
              <span>View Code</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-500 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors ml-0.5"
                title="Hide"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {isExpanded && (
          <div className="p-3 space-y-2.5">
            {/* Chat Messages */}
            {messages.length > 0 && (
              <div
                ref={chatScrollRef}
                className="max-h-60 overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
              >
                {messages.slice(-6).map((msg, idx, arr) => {
                  const isLatest = idx === arr.length - 1 && msg.role === 'assistant';
                  return (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl border transition-all ${
                        msg.role === 'user'
                          ? 'bg-slate-800/90 border-slate-700 ml-8'
                          : 'bg-cyan-950/40 border-cyan-700/50 mr-6 shadow-sm shadow-cyan-950/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                          {msg.role === 'assistant' ? 'AI' : 'You'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {msg.role === 'assistant' ? (
                        <StreamingTextAnimation text={msg.content} isLatest={isLatest} />
                      ) : (
                        <div className="text-xs text-slate-200 whitespace-pre-wrap">{msg.content}</div>
                      )}

                      {/* Show generated DSL section if available */}
                      {msg.role === 'assistant' && msg.generatedDSL && (
                        <div className="mt-2 pt-2 border-t border-slate-700/50">
                          <button
                            onClick={() => setExpandedDSL(expandedDSL === msg.id ? null : msg.id)}
                            className="flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 font-medium transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>✓ Flowchart Applied</span>
                            {expandedDSL === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          
                          {expandedDSL === msg.id && (
                            <div className="mt-1.5 p-2 bg-slate-900/80 border border-slate-700 rounded text-[10px] font-mono text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                              {msg.generatedDSL}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-end">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recommendation Buttons */}
            <div className="flex flex-col gap-1.5 mb-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold px-1 flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" /> AI Flow Recommendations:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {FLOW_RECOMMENDATIONS.map((rec, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(rec.prompt)}
                    disabled={isLoading}
                    className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-all text-left flex items-start gap-1 disabled:opacity-50 text-[11px]"
                  >
                    <span className="text-base leading-none">{rec.icon}</span>
                    <span className="font-medium line-clamp-2">{rec.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                  placeholder="Describe any flowchart or workflow..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all disabled:opacity-60"
                />
                {prompt && !isLoading && (
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                  >✕</button>
                )}
              </div>

              <button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shrink-0 ${
                  isLoading
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/50 cursor-wait'
                    : prompt.trim()
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/40 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin text-cyan-400" /><span>Generating...</span></>
                ) : (
                  <><Sparkles className="w-4 h-4 text-cyan-200" /><span className="hidden sm:inline">Generate</span><Send className="w-3.5 h-3.5 sm:hidden" /></>
                )}
              </button>
            </form>

            {/* Footer info */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                All responses from Local LLM
              </span>
              <span>
                Diagram: <strong className="text-slate-400">{nodeCount}</strong> nodes,{' '}
                <strong className="text-slate-400">{connectorCount}</strong> connections
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
