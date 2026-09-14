import React from 'react';
import { X, Layers, ArrowRight, ShieldCheck, ShoppingCart, Sparkles, Plus } from 'lucide-react';
import { FLOWCHART_TEMPLATES } from '../data/templates';
import { TemplateDefinition } from '../types';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TemplateDefinition) => void;
  onNewBlank: () => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  onNewBlank,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Choose Flowchart Template
              </h2>
              <p className="text-xs text-slate-400">
                Get started quickly with ready-to-use workflow scenarios or a blank canvas
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

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3 custom-scrollbar">
          {/* Option: Blank Canvas */}
          <div
            onClick={() => {
              onNewBlank();
              onClose();
            }}
            className="p-3.5 rounded-xl border border-dashed border-slate-700 hover:border-cyan-500 bg-slate-950/40 hover:bg-slate-800/50 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  Blank Canvas
                </h3>
                <p className="text-[11px] text-slate-400">
                  Start designing your flowchart diagram completely from scratch
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-cyan-400 flex items-center gap-1">
              Select <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pt-2">
            Featured Workflow Templates
          </div>

          {/* List of Templates */}
          {FLOWCHART_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                onSelectTemplate(tmpl);
                onClose();
              }}
              className="p-4 rounded-xl border border-slate-800 hover:border-cyan-500/80 bg-slate-950/80 hover:bg-slate-800/70 cursor-pointer transition-all hover:shadow-xl group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {tmpl.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {tmpl.description}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-mono">
                    <span>{tmpl.nodes.length} Nodes</span>
                    <span>•</span>
                    <span>{tmpl.connectors.length} Connectors</span>
                  </div>
                </div>

                <div className="shrink-0 p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
