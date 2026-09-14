import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Server,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cpu,
  Globe,
  Sliders,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { LLMConfig, LLMProvider } from '../types';
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
  const [showKey, setShowKey] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [savedBadge, setSavedBadge] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleProviderSelect = (provider: LLMProvider) => {
    setFormData((prev) => ({ ...prev, provider }));
    setTestResult(null);
  };

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-950">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                AI & LLM Model Settings
              </h2>
              <p className="text-xs text-slate-400">
                Choose an AI provider (Gemini, OpenAI, Claude) or connect to your local LLM server (127.0.0.1:8088).
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
          {/* Provider Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Active LLM Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleProviderSelect('custom_local')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  formData.provider === 'custom_local'
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/50'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Local LLM</span>
                </div>
                <span className="text-[10px] text-slate-400">127.0.0.1:8088</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderSelect('gemini')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  formData.provider === 'gemini'
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/50'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Gemini</span>
                </div>
                <span className="text-[10px] text-slate-400">Google AI Studio</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderSelect('openai')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  formData.provider === 'openai'
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/50'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>OpenAI</span>
                </div>
                <span className="text-[10px] text-slate-400">GPT-4o / Mini</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderSelect('claude')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  formData.provider === 'claude'
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/50'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>Claude</span>
                </div>
                <span className="text-[10px] text-slate-400">Anthropic AI</span>
              </button>
            </div>
          </div>

          {/* Provider Specific Inputs */}
          {formData.provider === 'custom_local' && (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
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
                  Completion Endpoint URL
                </label>
                <input
                  type="text"
                  value={formData.customEndpoint}
                  onChange={(e) => setFormData({ ...formData, customEndpoint: e.target.value })}
                  placeholder="http://127.0.0.1:8088/completion"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports llama-server native endpoint (e.g. <code className="text-cyan-400 font-mono">http://127.0.0.1:8088/completion</code>) or local OpenAI-compatible endpoints.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    API Key / Bearer Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={formData.customApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, customApiKey: e.target.value })}
                    placeholder="Leave blank if no auth required"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Model Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.customModel || ''}
                    onChange={(e) => setFormData({ ...formData, customModel: e.target.value })}
                    placeholder="local-model"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.provider === 'gemini' && (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Google Gemini Configuration
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Get Gemini API Key &rarr;
                </a>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={formData.geminiApiKey}
                    onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 pr-10 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Gemini Model
                </label>
                <select
                  value={formData.geminiModel}
                  onChange={(e) => setFormData({ ...formData, geminiModel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Fast, Accurate & Efficient)</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Next-Gen High Performance)</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex Reasoning)</option>
                </select>
              </div>
            </div>
          )}

          {formData.provider === 'openai' && (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  OpenAI (ChatGPT) Configuration
                </span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Get OpenAI API Key &rarr;
                </a>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={formData.openaiApiKey}
                    onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                    placeholder="sk-proj-..."
                    className="w-full px-3 py-2 pr-10 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Model
                  </label>
                  <select
                    value={formData.openaiModel}
                    onChange={(e) => setFormData({ ...formData, openaiModel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Fast & Cost Effective)</option>
                    <option value="gpt-4o">gpt-4o (High Capability)</option>
                    <option value="o3-mini">o3-mini (Advanced Reasoning)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Base URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.openaiBaseUrl}
                    onChange={(e) => setFormData({ ...formData, openaiBaseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.provider === 'claude' && (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  Anthropic Claude Configuration
                </span>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Get Claude API Key &rarr;
                </a>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Claude API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={formData.claudeApiKey}
                    onChange={(e) => setFormData({ ...formData, claudeApiKey: e.target.value })}
                    placeholder="sk-ant-api..."
                    className="w-full px-3 py-2 pr-10 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Claude Model
                </label>
                <select
                  value={formData.claudeModel}
                  onChange={(e) => setFormData({ ...formData, claudeModel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022 (Intelligent & Precise)</option>
                  <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022 (Lightning Fast)</option>
                </select>
              </div>
            </div>
          )}

          {/* Temperature Slider */}
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-xs font-medium text-slate-300">AI Temperature (Creativity vs Precision)</span>
                <p className="text-[10px] text-slate-400">Lower values (0.1 - 0.3) are recommended for consistent, deterministic flowcharts.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-24 accent-cyan-500"
              />
              <span className="text-xs font-mono text-cyan-400 w-8 text-right">{formData.temperature}</span>
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
                  {testResult.success ? 'Connection Successful!' : 'Connection Failed:'}
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
                <span>Testing Connection...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test LLM Connection</span>
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
