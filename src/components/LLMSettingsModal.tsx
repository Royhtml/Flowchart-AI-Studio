import React, { useState } from 'react';
import {
  X,
  Server,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Brain,
} from 'lucide-react';
import { LLMConfig } from '../types';
import { testLLMConnection } from '../utils/llmService';

interface LLMSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onSaveConfig: (newConfig: LLMConfig) => void;
}

export const LLMSettingsModal: React.FC<LLMSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<LLMConfig>({ ...config });
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [savedBadge, setSavedBadge] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testLLMConnection(formData);
    setTesting(false);
    setTestResult(result);
  };

  const handleSave = () => {
    onSaveConfig(formData);
    setSavedBadge(true);
    setTimeout(() => {
      setSavedBadge(false);
      onClose();
    }, 800);
  };

  return (
    <div
      id="llm-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-950">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Local LLM Server Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Connect to your local LLM running on http://127.0.0.1:8088
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Local LLM Endpoint Configuration */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                <Server className="w-4 h-4" />
                Local LLM Server (llama.cpp, LM Studio, Ollama, etc.)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                Offline / Private
              </span>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                LLM Server Endpoint URL
              </label>
              <input
                type="text"
                value={formData.customEndpoint}
                onChange={(e) => setFormData({ ...formData, customEndpoint: e.target.value })}
                placeholder="http://127.0.0.1:8088/completion"
                className="w-full px-3 py-2 bg-slate-900 border border-cyan-500/30 rounded-lg text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
              <p className="text-[10px] text-slate-400 mt-1.5">
                Default: <code className="text-cyan-400 font-mono bg-slate-900 px-1 rounded">http://127.0.0.1:8088/completion</code>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Model Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.customModel || ''}
                  onChange={(e) => setFormData({ ...formData, customModel: e.target.value })}
                  placeholder="e.g., llama-2, mistral"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Temperature (0.0 - 1.0)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="flex-1 accent-cyan-500"
                  />
                  <span className="text-xs font-mono text-cyan-400 w-8 text-right">{formData.temperature.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-cyan-950/30 border border-cyan-500/20 p-3 rounded-lg">
              <p className="text-[10px] text-cyan-200">
                ℹ️ <strong>Tip:</strong> Make sure your LLM server is running. Temperature 0.2-0.3 recommended for consistent responses.
              </p>
            </div>
          </div>

          {/* AI Personality/System Prompt */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-indigo-500/30 space-y-3">
            <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
              <Brain className="w-4 h-4" />
              AI Personality & System Prompt (Optional)
            </span>
            <div>
              <label className="block text-xs text-slate-300 mb-2">
                Customize AI Behavior
              </label>
              <textarea
                value={formData.claudeApiKey || 'Kamu adalah asisten AI yang pintar dan ramah. Berikan jawaban yang tepat dan JANGAN PERNAH mengulang kalimat yang sama. Jika user mengirim file gambar, kamu hanya bisa melihat nama file tapi tidak bisa memproses visual gambar karena kamu model text-only, jelaskan hal itu dengan sopan.'}
                onChange={(e) => setFormData({ ...formData, claudeApiKey: e.target.value })}
                placeholder="Masukkan system prompt untuk mengatur kepribadian AI..."
                rows={6}
                className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/30 rounded-lg text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 font-mono resize-none"
              />
              <p className="text-[10px] text-slate-400 mt-2">
                💡 <strong>Contoh:</strong> "Kamu adalah AI yang ramah, profesional, dan helpful. Jawab dengan singkat, jelas, dan gunakan Bahasa Indonesia."
              </p>
            </div>
          </div>

          {/* Test Connection Output */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-semibold">
                  {testResult.success ? '✓ Connection Successful!' : '✗ Connection Failed:'}
                </span>
                <p className="text-[11px] opacity-90 whitespace-pre-wrap">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              {savedBadge ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
