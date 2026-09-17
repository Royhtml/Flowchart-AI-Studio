import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Copy,
  Check,
  Download,
  RotateCcw,
  Layers,
  ArrowRight,
  GitBranch,
  ShieldAlert,
  Zap,
  Flame,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { FlowNode, FlowConnector, LLMConfig } from '../types';
import {
  chatWithCanvasDetailAI,
  DetailAIChatMessage,
  buildCanvasTopologySummary,
  getSaranAI,
  getNilaiAI,
} from '../utils/llmService';
import { sanitizeMarkdown } from '../utils/textFormatter';

// Streaming animation component
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
        const next = Math.min(prev + 6, text.length);
        if (next >= text.length) {
          clearInterval(interval);
          setCompleted(true);
        }
        return next;
      });
    }, 10);

    return () => clearInterval(interval);
  }, [text, isLatest]);

  return (
    <div className="relative">
      <div className="whitespace-pre-wrap">{text.slice(0, displayedChars)}</div>
      {!completed && (
        <span className="inline-block w-1 h-4 ml-1 rounded-[1px] bg-gradient-to-b from-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(34,197,234,0.8)] animate-pulse" />
      )}
    </div>
  );
};

interface AIAnalysisPanelProps {
  projectName: string;
  nodes: FlowNode[];
  connectors: FlowConnector[];
  llmConfig?: LLMConfig;
  onSelectNode?: (nodeId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

type TabId = 'detail' | 'saran' | 'nilai';

interface TabMessages {
  detail: DetailAIChatMessage[];
  saran: DetailAIChatMessage[];
  nilai: DetailAIChatMessage[];
}

const TABS = [
  { id: 'detail' as TabId, label: 'Detail AI', icon: '📖' },
  { id: 'saran' as TabId, label: 'Saran AI', icon: '💡' },
  { id: 'nilai' as TabId, label: 'Nilai AI', icon: '⚡' },
];

const WELCOME_MESSAGES: Record<TabId, string> = {
  detail: `📖 Detail AI - Flowchart Explanation

Tanyakan apapun tentang flowchart proyek ini:
• Jelaskan alur lengkap
• Identifikasi bottleneck
• Analisis decision points
• Dokumentasi SOP

Semua jawaban digenerate oleh LLM secara real-time.`,
  saran: `💡 Saran AI - Improvement Recommendations

Dapatkan saran konkrit untuk meningkatkan flowchart:
• Efisiensi dan optimasi proses
• Penanganan error dan edge cases
• Keamanan dan validasi
• Performa dan bottleneck`,
  nilai: `⚡ Nilai AI - Quality Assessment

Analisis menyeluruh kualitas flowchart Anda:
• Quality Score (0-100)
• Strengths dan weaknesses
• Prioritized recommendations
• Architecture quality rating`,
};

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  projectName,
  nodes,
  connectors,
  llmConfig,
  onSelectNode,
  isOpen = true,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('detail');
  const [tabMessages, setTabMessages] = useState<TabMessages>({
    detail: [{ id: 'welcome-detail', role: 'assistant', content: WELCOME_MESSAGES.detail, timestamp: Date.now() }],
    saran: [{ id: 'welcome-saran', role: 'assistant', content: WELCOME_MESSAGES.saran, timestamp: Date.now() }],
    nilai: [{ id: 'welcome-nilai', role: 'assistant', content: WELCOME_MESSAGES.nilai, timestamp: Date.now() }],
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const topology = buildCanvasTopologySummary({
    projectName,
    nodes,
    connectors,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tabMessages, isLoading]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (touchStart - touchEnd > 50) {
      // Swiped left - next tab
      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      if (currentIndex < TABS.length - 1) {
        setActiveTab(TABS[currentIndex + 1].id);
      }
    }
    if (touchEnd - touchStart > 50) {
      // Swiped right - previous tab
      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      if (currentIndex > 0) {
        setActiveTab(TABS[currentIndex - 1].id);
      }
    }
  };

  // Handle tab-specific send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading || !llmConfig) return;

    const userMsg: DetailAIChatMessage = {
      id: `user-${activeTab}-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    try {
      setTabMessages((prev) => ({
        ...prev,
        [activeTab]: [...prev[activeTab], userMsg],
      }));
      if (!textToSend) setInput('');
      setIsLoading(true);
      setErrorMessage(null);

      console.log(`[AIAnalysisPanel] ${activeTab}: Sending message:`, query);

      let responseText: string;

      if (activeTab === 'detail') {
        responseText = await chatWithCanvasDetailAI(
          query,
          { projectName, nodes, connectors },
          tabMessages[activeTab],
          llmConfig
        );
      } else if (activeTab === 'saran') {
        responseText = await getSaranAI('', { projectName, nodes, connectors }, llmConfig);
      } else {
        // nilai
        responseText = await getNilaiAI('', { projectName, nodes, connectors }, llmConfig);
      }

      const aiMsg: DetailAIChatMessage = {
        id: `assistant-${activeTab}-${Date.now()}`,
        role: 'assistant',
        content: responseText || 'No response available',
        timestamp: Date.now(),
      };

      setTabMessages((prev) => ({
        ...prev,
        [activeTab]: [...prev[activeTab], aiMsg],
      }));
    } catch (err: any) {
      const errorMsg = err?.message || `Error in ${activeTab} AI`;
      console.error(`[AIAnalysisPanel] ${activeTab} error:`, err);
      setErrorMessage(errorMsg);

      setTabMessages((prev) => ({
        ...prev,
        [activeTab]: [
          ...prev[activeTab],
          {
            id: `error-${activeTab}-${Date.now()}`,
            role: 'assistant',
            content: `❌ Error: ${errorMsg}`,
            timestamp: Date.now(),
          },
        ],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetTab = () => {
    setTabMessages((prev) => ({
      ...prev,
      [activeTab]: [
        {
          id: `welcome-${activeTab}`,
          role: 'assistant',
          content: WELCOME_MESSAGES[activeTab],
          timestamp: Date.now(),
        },
      ],
    }));
    setInput('');
  };

  const isLatest = (msgId: string) => {
    const latestAssistant = [...tabMessages[activeTab]]
      .reverse()
      .find((m) => m.role === 'assistant');
    return latestAssistant?.id === msgId;
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-slate-200 leading-relaxed break-words">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="text-sm font-bold text-cyan-300 mt-2.5 mb-1 pb-1 border-b border-cyan-500/20 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('#### ')) {
            return (
              <h5 key={idx} className="text-xs font-semibold text-blue-300 mt-2 mb-0.5">
                {line.replace('#### ', '')}
              </h5>
            );
          }
          if (line.startsWith('> ')) {
            return (
              <div key={idx} className="p-2 rounded bg-amber-950/40 border-l-2 border-amber-500 text-amber-200 text-[11px] my-1">
                {line.replace('> ', '')}
              </div>
            );
          }
          if (line.includes('|---')) {
            return null;
          }
          if (line.startsWith('|') && line.endsWith('|')) {
            const cols = line.split('|').filter((c) => c.trim().length > 0);
            return (
              <div key={idx} className="grid grid-cols-4 gap-1 p-1 bg-slate-950/50 border border-slate-800/80 rounded text-[10px]">
                {cols.map((col, cIdx) => (
                  <div key={cIdx} className="overflow-hidden text-ellipsis whitespace-nowrap text-slate-300 font-mono">
                    {col.trim()}
                  </div>
                ))}
              </div>
            );
          }
          if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
            const clean = line.trim().replace(/^[-*•]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span className="flex-1">{clean}</span>
              </div>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }

          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  const containerClass = isMobile
    ? 'fixed inset-0 z-50 flex flex-col bg-slate-950'
    : 'flex-1 flex flex-col h-full bg-slate-950/60 rounded-lg border border-slate-800/50 overflow-hidden';

  if (!isOpen && !isMobile) return null;

  return (
    <div className={containerClass} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Mobile header with close button */}
      {isMobile && (
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-100">AI Analysis Panel</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={`flex items-center justify-between ${isMobile ? 'px-4 py-3' : 'px-3 py-2'} bg-gradient-to-r from-cyan-950/50 via-slate-900 to-blue-950/50 border-b border-cyan-500/20 shrink-0`}>
        <div className="flex items-center gap-2">
          {/* Mobile: Show current tab with arrows */}
          {isMobile ? (
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => {
                  const currentIndex = TABS.findIndex((t) => t.id === activeTab);
                  if (currentIndex > 0) setActiveTab(TABS[currentIndex - 1].id);
                }}
                disabled={TABS.findIndex((t) => t.id === activeTab) === 0}
                className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 flex items-center gap-2 justify-center">
                <span className="text-lg">{TABS.find((t) => t.id === activeTab)?.icon}</span>
                <span className="font-semibold text-slate-200">{TABS.find((t) => t.id === activeTab)?.label}</span>
              </div>

              <button
                onClick={() => {
                  const currentIndex = TABS.findIndex((t) => t.id === activeTab);
                  if (currentIndex < TABS.length - 1) setActiveTab(TABS[currentIndex + 1].id);
                }}
                disabled={TABS.findIndex((t) => t.id === activeTab) === TABS.length - 1}
                className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            // Desktop: Show all tabs
            <div className="flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-cyan-600 text-white shadow-lg'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info badge on desktop */}
        {!isMobile && (
          <div className="text-[10px] text-slate-400 px-2 py-0.5 bg-slate-800/50 rounded">
            {projectName}
          </div>
        )}
      </div>

      {/* Canvas Metrics */}
      <div className={`${isMobile ? 'px-4 py-2' : 'px-3 py-1.5'} bg-slate-900/50 border-b border-slate-800 grid grid-cols-3 gap-1 text-[10px]`}>
        <div className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700 flex items-center justify-between">
          <span className="text-slate-400">Nodes:</span>
          <span className="font-bold text-slate-200">{topology.nodeCount}</span>
        </div>
        <div className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700 flex items-center justify-between">
          <span className="text-slate-400">Connectors:</span>
          <span className="font-bold text-slate-200">{topology.connectorCount}</span>
        </div>
        <div className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700 flex items-center justify-between">
          <span className="text-slate-400">Branches:</span>
          <span className="font-bold text-slate-200">{topology.decisionCount}</span>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="px-4 py-2 bg-rose-950/90 border-b border-rose-800/60 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="line-clamp-2">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white text-xs underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className={`flex-1 ${isMobile ? 'px-4 py-3' : 'p-3'} overflow-y-auto space-y-3 custom-scrollbar`}>
        {tabMessages[activeTab].map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-1.5 mb-1 px-1">
              {msg.role === 'assistant' ? (
                <>
                  <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-[10px]">
                    {TABS.find((t) => t.id === activeTab)?.icon}
                  </div>
                  <span className="text-[10px] font-semibold text-cyan-300">
                    {TABS.find((t) => t.id === activeTab)?.label}
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">You</span>
              )}
              <span className="text-[9px] text-slate-500">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[95%] break-words ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-700 to-blue-700 text-white rounded-tr-xs shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-sm w-full'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : isLatest(msg.id) ? (
                <StreamingTextAnimation text={msg.content} isLatest={true} />
              ) : (
                renderFormattedContent(sanitizeMarkdown(msg.content))
              )}

              {/* Action buttons for assistant messages */}
              {msg.role === 'assistant' && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-[9px] text-slate-500">Response</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="hover:text-cyan-300 flex items-center gap-1 transition-colors"
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
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs text-cyan-300 w-fit animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Analyzing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action: Reset button */}
      <div className={`${isMobile ? 'px-4 py-2' : 'p-2'} border-t border-slate-800/80 bg-slate-900/70 shrink-0`}>
        <button
          onClick={handleResetTab}
          className="w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700 transition-colors flex items-center justify-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Chat
        </button>
      </div>

      {/* Input Box */}
      <div className={`${isMobile ? 'px-4 py-3' : 'p-2.5'} border-t border-slate-800 bg-slate-900 shrink-0`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={`Ask ${TABS.find((t) => t.id === activeTab)?.label}...`}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-xl text-white transition-all shadow-md shrink-0 ${
              input.trim() && !isLoading
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

