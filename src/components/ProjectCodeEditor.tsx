import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  Code2,
  Sparkles,
  AlertCircle,
  Play,
  RotateCcw,
  CheckCircle2,
  FileCode2,
  Maximize2,
  Columns,
  CloudCheck,
  Save,
} from 'lucide-react';
import { FlowNode, FlowConnector } from '../types';
import { diagramToDSL, dslToDiagram, ParseResult } from '../utils/codeSync';

interface ProjectCodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: FlowNode[];
  connectors: FlowConnector[];
  onApplyChanges: (nodes: FlowNode[], connectors: FlowConnector[]) => void;
}

type EditorLayout = 'modal' | 'docked';

export const ProjectCodeEditor: React.FC<ProjectCodeEditorProps> = ({
  isOpen,
  onClose,
  nodes,
  connectors,
  onApplyChanges,
}) => {
  const [layout, setLayout] = useState<EditorLayout>('modal');
  const [codeContent, setCodeContent] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [savedStatus, setSavedStatus] = useState<string>('Auto-Saved');
  const [parseStatus, setParseStatus] = useState<{
    valid: boolean;
    message?: string;
    line?: number;
  }>({ valid: true });
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const debounceTimerRef = useRef<any>(null);

  // Synchronize canvas state to FlowScript code when editor opens or canvas changes externally
  useEffect(() => {
    if (!isOpen) return;
    if (isTyping) return; // Do not overwrite while user is actively typing in the editor

    const dsl = diagramToDSL(nodes, connectors);
    setCodeContent(dsl);
    setParseStatus({ valid: true });
    setSavedStatus('Synced with Canvas');
  }, [isOpen, nodes, connectors, isTyping]);

  if (!isOpen) return null;

  // Handle textarea live editing with debounce & auto-save to canvas
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCodeContent(val);
    setIsTyping(true);
    setSavedStatus('Saving changes...');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      const result: ParseResult = dslToDiagram(val);

      if (result.success && result.nodes && result.connectors) {
        setParseStatus({ valid: true });
        onApplyChanges(result.nodes, result.connectors);
        setSavedStatus('Auto-Saved');
      } else {
        setParseStatus({
          valid: false,
          message: result.error || 'Syntax format error',
          line: result.errorLine,
        });
        setSavedStatus('Invalid Syntax');
      }
    }, 350);
  };

  // Immediate manual apply button
  const handleManualApply = () => {
    const result: ParseResult = dslToDiagram(codeContent);

    if (result.success && result.nodes && result.connectors) {
      setParseStatus({ valid: true });
      onApplyChanges(result.nodes, result.connectors);
      setSavedStatus('Applied & Saved');
    } else {
      setParseStatus({
        valid: false,
        message: result.error || 'Code format is invalid',
        line: result.errorLine,
      });
      setSavedStatus('Fix Syntax Errors');
    }
  };

  // Format / Beautify
  const handleFormat = () => {
    const result: ParseResult = dslToDiagram(codeContent);
    if (result.success && result.nodes && result.connectors) {
      setCodeContent(diagramToDSL(result.nodes, result.connectors));
      setParseStatus({ valid: true });
      setSavedStatus('Code Formatted');
    }
  };

  // Reset to current canvas state
  const handleSyncFromCanvas = () => {
    setCodeContent(diagramToDSL(nodes, connectors));
    setParseStatus({ valid: true });
    setSavedStatus('Synced from Canvas');
  };

  // Copy code to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = codeContent.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 18) }, (_, i) => i + 1);

  // Container styling based on layout
  const isDocked = layout === 'docked';

  return (
    <div
      id="project-code-editor-container"
      className={
        isDocked
          ? 'fixed top-0 right-0 bottom-0 w-[560px] max-w-full z-40 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col text-slate-200 animate-in slide-in-from-right duration-200'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200'
      }
    >
      <div
        className={
          isDocked
            ? 'w-full h-full flex flex-col overflow-hidden bg-slate-900'
            : 'w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200'
        }
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-950">
              <FileCode2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  Project Code Editor (FlowScript)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Live Sync
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{savedStatus}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Integrated bi-directional editing: changes here update the visual diagram instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Split Screen / Docked Toggle */}
            <button
              onClick={() => setLayout(isDocked ? 'modal' : 'docked')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isDocked ? 'Switch to Modal View' : 'Dock to Right (Split View)'}
            >
              {isDocked ? <Maximize2 className="w-4 h-4" /> : <Columns className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Code Editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="px-5 py-2 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleFormat}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Format FlowScript code"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Format Code</span>
            </button>

            <button
              onClick={handleSyncFromCanvas}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Reload code from current canvas state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reload from Canvas</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Copy code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualApply}
              className="px-3.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Apply code changes to canvas"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Apply to Canvas</span>
            </button>
          </div>
        </div>

        {/* Code Editor Workspace */}
        <div className="flex-1 relative flex bg-slate-950 font-mono text-xs overflow-hidden">
          {/* Gutter Line Numbers */}
          <div className="w-12 py-3 bg-slate-950 border-r border-slate-800/80 text-right pr-3 select-none text-slate-600 shrink-0 font-mono text-xs leading-relaxed">
            {lineNumbers.map((num) => (
              <div
                key={num}
                className={parseStatus.line === num ? 'text-rose-400 font-bold bg-rose-950/40' : ''}
              >
                {num}
              </div>
            ))}
          </div>

          {/* Textarea Area */}
          <textarea
            value={codeContent}
            onChange={handleCodeChange}
            placeholder={
              '// Write FlowScript code here...\n[NODES]\nterminator: start "Start"\nprocess: p1 "Step 1"\nterminator: end "End"\n\n[CONNECTORS]\nstart -> p1\np1 -> end'
            }
            spellCheck={false}
            className="flex-1 h-full p-3 bg-transparent text-slate-200 placeholder-slate-600 outline-none resize-none overflow-auto font-mono text-xs leading-relaxed custom-scrollbar selection:bg-cyan-500/30 selection:text-white"
          />
        </div>

        {/* Bottom Status Footer */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            {parseStatus.valid ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium truncate">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Valid Diagram ({nodes.length} nodes, {connectors.length} connectors) • Auto-saved
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-rose-400 font-medium animate-pulse truncate">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {parseStatus.message}
                  {parseStatus.line ? ` (line ${parseStatus.line})` : ''}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
            <span className="hidden sm:inline">
              Syntax: <code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded">id1 -&gt; id2 "Label"</code>
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
