import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Download,
  RotateCcw,
  Layers,
  ArrowRight,
  GitBranch,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { FlowNode, FlowConnector, LLMConfig } from '../types';
import {
  chatWithCanvasDetailAI,
  DetailAIChatMessage,
  buildCanvasTopologySummary,
} from '../utils/llmService';

interface DetailAIPanelProps {
  projectName: string;
  nodes: FlowNode[];
  connectors: FlowConnector[];
  llmConfig?: LLMConfig;
  onSelectNode?: (nodeId: string) => void;
}

export const DetailAIPanel: React.FC<DetailAIPanelProps> = ({
  projectName,
  nodes,
  connectors,
  llmConfig,
  onSelectNode,
}) => {
  const [messages, setMessages] = useState<DetailAIChatMessage[]>([
    {
      id: 'welcome-detail-ai',
      role: 'assistant',
      content: `### 👋 Selamat datang di Detail AI!
Saya adalah konsultan teknis yang **dikhususkan untuk membedah, menganalisis, dan membahas proyek canvas ini**.

Seluruh struktur node, konektor, dan percabangan diagram **"${projectName || 'Canvas Proyek'}"** telah tersinkronisasi. Anda dapat memilih aksi instan di bawah atau menanyakan pertanyaan spesifik apa pun mengenai alur ini.`,
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time canvas topology metrics
  const topology = buildCanvasTopologySummary({
    projectName,
    nodes,
    connectors,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: DetailAIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const responseText = await chatWithCanvasDetailAI(
        query,
        {
          projectName,
          nodes,
          connectors,
        },
        [...messages, userMsg],
        llmConfig
      );

      const aiMsg: DetailAIChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: DetailAIChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Terjadi kendala saat menganalisis alur canvas: ${err.message || 'Mohon coba kembali.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadMarkdown = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Detail_AI_${projectName.replace(/\s+/g, '_') || 'Canvas_Report'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Riwayat percakapan telah direset. Detail AI siap mendiskusikan canvas **"${projectName || 'Proyek'}"** kembali.`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Helper to render simple markdown with bold, headers, and bullet lines
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-slate-200 leading-relaxed break-words">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="text-sm font-bold text-purple-300 mt-2.5 mb-1 pb-1 border-b border-purple-500/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('#### ')) {
            return (
              <h5 key={idx} className="text-xs font-semibold text-cyan-300 mt-2 mb-0.5">
                {line.replace('#### ', '')}
              </h5>
            );
          }
          // Blockquote / warning
          if (line.startsWith('> ')) {
            return (
              <div key={idx} className="p-2 rounded bg-amber-950/40 border-l-2 border-amber-500 text-amber-200 text-[11px] my-1">
                {line.replace('> ', '')}
              </div>
            );
          }
          // Table row separator
          if (line.includes('|---')) {
            return null;
          }
          // Table row
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
          // Bullet point
          if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
            const clean = line.trim().replace(/^[-*•]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-purple-400 mt-0.5">•</span>
                <span className="flex-1" dangerouslySetInnerHTML={{ __html: formatInline(clean) }} />
              </div>
            );
          }
          // Empty line
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }

          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          );
        })}
      </div>
    );
  };

  // Inline formatting for **bold**, `code`, and *italic*
  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-purple-200">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.2 bg-slate-800 text-cyan-300 rounded font-mono text-[10px] border border-slate-700">$1</code>')
      .replace(/\*(.*?)\*/g, '<em class="text-slate-300 italic">$1</em>');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 overflow-hidden select-text">
      {/* Top Project Canvas Context Bar */}
      <div className="p-3 bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border-b border-purple-500/20 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-sm shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-purple-200 truncate">Detail AI</h3>
                <span className="px-1.5 py-0.2 bg-purple-500/30 text-purple-200 border border-purple-400/40 rounded text-[9px] font-semibold">
                  Canvas Analyst
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                Proyek: <span className="text-slate-200 font-medium">{projectName || 'Flowchart Project'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleResetChat}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset Percakapan Detail AI"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Live Canvas Metrics */}
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          <div className="px-2 py-1 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> Node:
            </span>
            <span className="font-bold text-slate-200">{topology.nodeCount}</span>
          </div>

          <div className="px-2 py-1 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-emerald-400" /> Konektor:
            </span>
            <span className="font-bold text-slate-200">{topology.connectorCount}</span>
          </div>

          <div className="px-2 py-1 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-amber-400" /> Cabang:
            </span>
            <span className="font-bold text-slate-200">{topology.decisionCount}</span>
          </div>
        </div>

        {/* Health status banner */}
        {topology.isolatedNodes.length > 0 ? (
          <div className="mt-1.5 px-2 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-[10px] text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">
              Terdapat {topology.isolatedNodes.length} node belum terhubung ke alur
            </span>
          </div>
        ) : (
          <div className="mt-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-[9px] text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
            <span>Konektivitas topologi canvas valid</span>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              {msg.role === 'assistant' ? (
                <>
                  <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 text-[10px]">
                    <Sparkles className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-purple-300">Detail AI</span>
                </>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">Anda</span>
              )}
              <span className="text-[9px] text-slate-500">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[95%] break-words ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-tr-xs shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-sm w-full'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                renderFormattedContent(msg.content)
              )}

              {/* Action Toolbar for Assistant Messages */}
              {msg.role === 'assistant' && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-[9px] text-slate-500">Analisis Canvas Proyek</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="hover:text-purple-300 flex items-center gap-1 transition-colors"
                      title="Salin hasil analisis"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownloadMarkdown(msg.content)}
                      className="hover:text-purple-300 flex items-center gap-1 transition-colors"
                      title="Download laporan (.md)"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export MD</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-purple-500/30 text-xs text-purple-300 w-fit animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            <span>Detail AI sedang menganalisis arsitektur canvas...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips specifically for canvas discussion */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/70 shrink-0">
        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1 flex items-center gap-1">
          <Zap className="w-2.5 h-2.5 text-purple-400" />
          <span>Topik Pembahasan Khusus Canvas:</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
          {[
            { label: 'Jelaskan Seluruh Alur', icon: FileSearch, query: 'Jelaskan seluruh alur' },
            { label: 'Cek Bottleneck & Eror', icon: ShieldAlert, query: 'Cek bottleneck & node terputus' },
            { label: 'Buat SOP Dokumen', icon: FileText, query: 'Buat dokumentasi & sop proyek' },
            { label: 'Saran Optimasi Alur', icon: Sparkles, query: 'Saran optimasi alur' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.query)}
                disabled={isLoading}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-purple-950/60 text-slate-300 hover:text-purple-300 border border-slate-800 hover:border-purple-500/40 whitespace-nowrap shrink-0 transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <Icon className="w-2.5 h-2.5 text-purple-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-900 shrink-0">
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
            placeholder="Tanya hal spesifik tentang alur canvas ini..."
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-xl text-white transition-all shadow-md shrink-0 ${
              input.trim() && !isLoading
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
            title="Kirim pertanyaan ke Detail AI"
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
