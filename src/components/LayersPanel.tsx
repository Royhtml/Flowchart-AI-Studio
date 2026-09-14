import React, { useState, useRef } from 'react';
import {
  Layers,
  X,
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  Maximize,
  Minimize,
  Sliders,
  GripVertical,
} from 'lucide-react';
import { FlowNode } from '../types';

interface LayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: FlowNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onBringToFront: (nodeId: string) => void;
  onSendToBack: (nodeId: string) => void;
  onBringForward: (nodeId: string) => void;
  onSendBackward: (nodeId: string) => void;
  onReorderNodes: (nodes: FlowNode[]) => void;
  onScaleDiagram?: (scaleFactor: number, onlySelected?: boolean) => void;
  onDeleteNode?: (nodeId: string) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  isOpen,
  onClose,
  nodes,
  selectedNodeId,
  onSelectNode,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onReorderNodes,
  onScaleDiagram,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // Position state for dragging the Layers panel
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  // Drag & drop state for layer items
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

  if (!isOpen) return null;

  // In DOM/SVG stack: index 0 is at the very back (bottom layer),
  // and index (length - 1) is at the very front (top layer).
  // In the panel, we display from Top (Front) to Bottom (Back) like Photoshop/Draw.io.
  const displayNodes = [...nodes].reverse();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Dragging the Layers Panel window by its header
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.stopPropagation();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    let initialX = panelPos?.x;
    let initialY = panelPos?.y;

    if (initialX === undefined || initialY === undefined) {
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
      } else {
        initialX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 340) : 100;
        initialY = 68;
      }
    }

    setIsDraggingPanel(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;

      const currentWidth = panelRef.current?.offsetWidth || 320;
      const currentHeight = panelRef.current?.offsetHeight || 420;

      const newX = Math.max(8, Math.min(window.innerWidth - currentWidth - 8, initialX! + dx));
      const newY = Math.max(56, Math.min(window.innerHeight - currentHeight - 8, initialY! + dy));

      setPanelPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDraggingPanel(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Drag & drop handlers for layer items reordering
  const handleItemDragStart = (e: React.DragEvent, nodeId: string) => {
    setDraggedNodeId(nodeId);
    e.dataTransfer.setData('text/plain', nodeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverNodeId !== targetId) {
      setDragOverNodeId(targetId);
    }
  };

  const handleItemDragLeave = () => {
    setDragOverNodeId(null);
  };

  const handleItemDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedNodeId || e.dataTransfer.getData('text/plain');
    setDraggedNodeId(null);
    setDragOverNodeId(null);

    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = nodes.findIndex((n) => n.id === sourceId);
    const targetIndex = nodes.findIndex((n) => n.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const updated = [...nodes];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);

    onReorderNodes(updated);
  };

  return (
    <div
      ref={panelRef}
      id="layers-panel"
      className={`fixed z-40 w-80 max-w-[calc(100vw-32px)] bg-slate-900/98 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden text-slate-200 transition-shadow ${
        isDraggingPanel ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'hover:border-cyan-500/40'
      }`}
      style={
        panelPos
          ? { left: `${panelPos.x}px`, top: `${panelPos.y}px` }
          : { top: '68px', right: '16px' }
      }
    >
      {/* Header - Draggable window handle */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className={`flex items-center justify-between px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800 select-none ${
          isDraggingPanel ? 'cursor-grabbing bg-slate-900' : 'cursor-grab hover:bg-slate-900/90'
        }`}
        title="Drag header to reposition Layers Panel anywhere"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <GripVertical className="w-4 h-4 text-slate-500" />
          <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              Layers & Z-Order
            </h3>
            <p className="text-[10px] text-slate-400">
              {nodes.length} Elements (Drag to reorder)
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Close Layers Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Element Quick Order Bar */}
      {selectedNode && (
        <div className="px-3 py-2 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="truncate max-w-[130px]">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">
              Selected
            </span>
            <span className="font-semibold text-cyan-300 text-xs truncate block">
              {selectedNode.label || 'Unnamed'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onBringToFront(selectedNode.id)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-200 transition-colors"
              title="Bring to Front (Paling Depan)"
            >
              <ChevronsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onBringForward(selectedNode.id)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-blue-400 hover:text-blue-200 transition-colors"
              title="Bring Forward (Maju 1 Layer)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSendBackward(selectedNode.id)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-blue-400 hover:text-blue-200 transition-colors"
              title="Send Backward (Mundur 1 Layer)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSendToBack(selectedNode.id)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-200 transition-colors"
              title="Send to Back (Paling Belakang)"
            >
              <ChevronsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Layers List (Top to Bottom Stack) - Draggable items to reorder */}
      <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-800/60 p-1.5 select-none">
        {displayNodes.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No flowchart elements yet.
          </div>
        ) : (
          displayNodes.map((node, reverseIndex) => {
            const actualIndex = nodes.length - 1 - reverseIndex;
            const isTop = actualIndex === nodes.length - 1;
            const isBottom = actualIndex === 0;
            const isSelected = node.id === selectedNodeId;
            const isBeingDragged = draggedNodeId === node.id;
            const isDropTarget = dragOverNodeId === node.id && !isBeingDragged;

            return (
              <div
                key={node.id}
                draggable
                onDragStart={(e) => handleItemDragStart(e, node.id)}
                onDragOver={(e) => handleItemDragOver(e, node.id)}
                onDragLeave={handleItemDragLeave}
                onDrop={(e) => handleItemDrop(e, node.id)}
                onClick={() => onSelectNode(node.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  isBeingDragged
                    ? 'opacity-40 border border-dashed border-cyan-500/60 bg-slate-800/50'
                    : isDropTarget
                    ? 'bg-cyan-950/80 border-2 border-cyan-400 shadow-md scale-[1.01]'
                    : isSelected
                    ? 'bg-cyan-950/70 border border-cyan-500/50 shadow-sm'
                    : 'hover:bg-slate-800/60 border border-transparent'
                }`}
                title="Click to select, or drag to reorder layer stack"
              >
                {/* Left: Drag grip, Index badge, color chip, and label */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <GripVertical className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 cursor-grab shrink-0" />

                  <span
                    className={`font-mono text-[10px] w-5 text-center font-bold ${
                      isTop
                        ? 'text-cyan-400'
                        : isBottom
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    #{actualIndex + 1}
                  </span>

                  <div
                    className="w-3.5 h-3.5 rounded-sm border shrink-0"
                    style={{
                      backgroundColor: node.fillColor,
                      borderColor: node.strokeColor,
                    }}
                  />

                  <div className="truncate flex-1">
                    <span
                      className={`font-medium truncate block ${
                        isSelected ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {node.label || 'Unnamed Element'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {node.type} • {node.width}×{node.height}
                    </span>
                  </div>
                </div>

                {/* Right: Layer shifting buttons */}
                <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                  <button
                    disabled={isTop}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBringForward(node.id);
                    }}
                    className={`p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors ${
                      isTop ? 'opacity-20 cursor-not-allowed' : ''
                    }`}
                    title="Move Layer Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={isBottom}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendBackward(node.id);
                    }}
                    className={`p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-amber-300 transition-colors ${
                      isBottom ? 'opacity-20 cursor-not-allowed' : ''
                    }`}
                    title="Move Layer Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: Quick Scale Section (Perbesar / Perkecil) */}
      <div className="p-3 bg-slate-950/70 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Quick Scale Element / Diagram</span>
          </span>
          {selectedNodeId && (
            <span className="text-[10px] text-cyan-400 font-medium">
              Selection Mode
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => onScaleDiagram?.(0.8, !!selectedNodeId)}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            title={selectedNodeId ? 'Shrink Selected by 20%' : 'Shrink All Flowchart by 20%'}
          >
            <Minimize className="w-3 h-3" />
            <span>-20%</span>
          </button>
          <button
            onClick={() => onScaleDiagram?.(0.9, !!selectedNodeId)}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            title={selectedNodeId ? 'Shrink Selected by 10%' : 'Shrink All Flowchart by 10%'}
          >
            <span>-10%</span>
          </button>
          <button
            onClick={() => onScaleDiagram?.(1.1, !!selectedNodeId)}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            title={selectedNodeId ? 'Enlarge Selected by 10%' : 'Enlarge All Flowchart by 10%'}
          >
            <span>+10%</span>
          </button>
          <button
            onClick={() => onScaleDiagram?.(1.2, !!selectedNodeId)}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            title={selectedNodeId ? 'Enlarge Selected by 20%' : 'Enlarge All Flowchart by 20%'}
          >
            <Maximize className="w-3 h-3" />
            <span>+20%</span>
          </button>
        </div>
      </div>
    </div>
  );
};
