import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlowNode,
  FlowConnector,
  PortPosition,
  CanvasState,
  ShapeType,
  ConnectorType,
  SimulationState,
  SimulationLog,
  TemplateDefinition,
} from './types';
import { FLOWCHART_TEMPLATES } from './data/templates';
import { exportFlowchartToPNG, exportFlowchartToPDF, exportFlowchartToSVG, exportToJSON, importFromJSON } from './utils/export';
import { getDiagramBounds } from './utils/geometry';

import { Toolbar } from './components/Toolbar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { FlowCanvas } from './components/FlowCanvas';
import { SimulationController } from './components/SimulationController';
import { ExecutionConsole } from './components/ExecutionConsole';
import { TemplatesModal } from './components/TemplatesModal';
import { ProjectCodeEditor } from './components/ProjectCodeEditor';
import { LLMSettingsModal } from './components/LLMSettingsModal';
import { CanvasAIChatBar } from './components/CanvasAIChatBar';
import { LayersPanel } from './components/LayersPanel';
import { ScaleDiagramModal } from './components/ScaleDiagramModal';
import { CustomShapesModal } from './components/CustomShapesModal';
import { ExportModal } from './components/ExportModal';
import { CanvasHistoryDrawer } from './components/CanvasHistoryDrawer';
import {
  CanvasHistoryItem,
  getCanvasHistory,
  addCanvasHistorySnapshot,
} from './utils/canvasHistoryStorage';
import { LLMConfig } from './types';
import { getStoredLLMConfig, saveStoredLLMConfig, generateFlowchartWithLLM } from './utils/llmService';
import { diagramToDSL, dslToDiagram, ParseResult } from './utils/codeSync';

export default function App() {
  // Initial state loaded from localStorage or first comprehensive template
  const initialTemplate = FLOWCHART_TEMPLATES[0];

  const [projectName, setProjectName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('flowchart_studio_autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) return parsed.name;
      }
    } catch {}
    return initialTemplate.name;
  });

  const [nodes, setNodes] = useState<FlowNode[]>(() => {
    try {
      const saved = localStorage.getItem('flowchart_studio_autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.nodes) && parsed.nodes.length > 0) {
          return parsed.nodes;
        }
      }
    } catch {}
    return initialTemplate.nodes;
  });

  const [connectors, setConnectors] = useState<FlowConnector[]>(() => {
    try {
      const saved = localStorage.getItem('flowchart_studio_autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.connectors)) {
          return parsed.connectors;
        }
      }
    } catch {}
    return initialTemplate.connectors;
  });

  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  // Active connector tool type
  const [activeConnectorType, setActiveConnectorType] = useState<ConnectorType>('orthogonal');

  // Canvas Viewport State
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 0.95,
    pan: { x: 30, y: 15 },
    gridType: 'dots',
    snapToGrid: true,
    gridSize: 24,
    showMinimap: true,
    isPanMode: false,
    paper: {
      showPaper: true,
      width: 1200,
      height: 800,
      borderColor: '#ffffff',
      borderStyle: 'solid',
      borderWidth: 2,
      bgColor: 'rgba(15, 23, 42, 0.4)',
      shadow: true,
      presetName: 'Standard (1200×800)',
    },
  });

  // History for Undo / Redo (persisted with 1MB LocalStorage limit)
  const [history, setHistory] = useState<{
    past: Array<{ nodes: FlowNode[]; connectors: FlowConnector[] }>;
    future: Array<{ nodes: FlowNode[]; connectors: FlowConnector[] }>;
  }>(() => {
    try {
      const savedSnapshots = getCanvasHistory();
      if (savedSnapshots.length > 0) {
        return {
          past: savedSnapshots.map((s) => ({ nodes: s.nodes, connectors: s.connectors })),
          future: [],
        };
      }
    } catch {}
    return {
      past: [],
      future: [],
    };
  });

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [canvasHistoryCount, setCanvasHistoryCount] = useState(() => getCanvasHistory().length);

  // Push to history helper with 1MB localStorage canvas persistence
  const recordHistory = useCallback(
    (customLabel?: string) => {
      setHistory((prev) => ({
        past: [...prev.past.slice(-25), { nodes, connectors }],
        future: [],
      }));

      try {
        const result = addCanvasHistorySnapshot({
          label: customLabel || `Snapshot (${nodes.length} node)`,
          projectName,
          nodes,
          connectors,
        });
        setCanvasHistoryCount(result.updatedHistory.length);
      } catch (err) {
        console.warn('[CanvasHistory] Error recording snapshot:', err);
      }
    },
    [nodes, connectors, projectName]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);

    setHistory({
      past: newPast,
      future: [{ nodes, connectors }, ...history.future],
    });
    setNodes(previous.nodes);
    setConnectors(previous.connectors);
    setSelectedNodeId(null);
    setSelectedConnectorId(null);
  }, [history, nodes, connectors]);

  // Redo
  const handleRedo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);

    setHistory({
      past: [...history.past, { nodes, connectors }],
      future: newFuture,
    });
    setNodes(next.nodes);
    setConnectors(next.connectors);
    setSelectedNodeId(null);
    setSelectedConnectorId(null);
  }, [history, nodes, connectors]);

  // Simulation State
  const [simulationState, setSimulationState] = useState<SimulationState>({
    status: 'idle',
    currentNodeId: null,
    activeConnectorId: null,
    speed: 1,
    logs: [],
    stepCount: 0,
    pulseProgress: 0,
  });

  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isLLMSettingsOpen, setIsLLMSettingsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isMoreShapesModalOpen, setIsMoreShapesModalOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(getStoredLLMConfig);

  // Left and Right Sidebar & AI Bar state with responsive defaults
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 768;
    return true;
  });
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 1024;
    return true;
  });
  const [isAIChatBarOpen, setIsAIChatBarOpen] = useState(true);

  const handleSaveLLMConfig = (newConfig: LLMConfig) => {
    setLlmConfig(newConfig);
    saveStoredLLMConfig(newConfig);
  };

  // AI Flowchart Generation state
  const [isGeneratingFlowchart, setIsGeneratingFlowchart] = useState(false);
  const [generationAnimationActive, setGenerationAnimationActive] = useState(false);
  
  // AI Chat Messages History
  const [aiChatMessages, setAiChatMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    flowchartCode?: string;
    timestamp: number;
  }>>([]);

  // Auto-save project state to localStorage whenever changes occur
  useEffect(() => {
    try {
      const payload = {
        name: projectName,
        nodes,
        connectors,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('flowchart_studio_autosave', JSON.stringify(payload));
    } catch (err) {
      console.warn('Auto-save to localStorage failed:', err);
    }
  }, [projectName, nodes, connectors]);

  // Debounced auto-snapshot to Canvas History in LocalStorage (Strictly capped at 1MB)
  const historyDebounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (nodes.length === 0 && connectors.length === 0) return;
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);

    historyDebounceRef.current = setTimeout(() => {
      try {
        const res = addCanvasHistorySnapshot({
          label: `Auto-snapshot (${nodes.length} node, ${connectors.length} konektor)`,
          projectName,
          nodes,
          connectors,
        });
        setCanvasHistoryCount(res.updatedHistory.length);
      } catch (err) {
        console.warn('[CanvasHistory] Auto-snapshot error:', err);
      }
    }, 4000);

    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, [nodes, connectors, projectName]);

  // Update canvas state
  const handleUpdateCanvasState = (updates: Partial<CanvasState>) => {
    setCanvasState((prev) => ({ ...prev, ...updates }));
  };

  // Reset Zoom & Fit to Screen
  const handleResetZoom = useCallback(() => {
    const bounds = getDiagramBounds(nodes);
    const viewportWidth = window.innerWidth - 320 - 256;
    const viewportHeight = window.innerHeight - 56;

    const scaleX = (viewportWidth - 100) / bounds.width;
    const scaleY = (viewportHeight - 100) / bounds.height;
    const fitZoom = Math.min(1.2, Math.max(0.4, Math.min(scaleX, scaleY)));

    const centerPanX = (viewportWidth - bounds.width * fitZoom) / 2 - bounds.minX * fitZoom;
    const centerPanY = (viewportHeight - bounds.height * fitZoom) / 2 - bounds.minY * fitZoom;

    setCanvasState((prev) => ({
      ...prev,
      zoom: fitZoom,
      pan: { x: centerPanX, y: centerPanY },
    }));
  }, [nodes]);

  // Restore snapshot from Canvas History (Riwayat Canvas)
  const handleRestoreHistory = useCallback(
    (item: CanvasHistoryItem) => {
      // Push current canvas state to undo stack before restoring
      setHistory((prev) => ({
        past: [...prev.past.slice(-25), { nodes, connectors }],
        future: [],
      }));
      setNodes(item.nodes);
      setConnectors(item.connectors);
      if (item.projectName) {
        setProjectName(item.projectName);
      }
      setSelectedNodeId(null);
      setSelectedConnectorId(null);
      setTimeout(handleResetZoom, 80);
    },
    [nodes, connectors, handleResetZoom]
  );

  const [pendingDecision, setPendingDecision] = useState<{
    nodeId: string;
    branches: Array<{ connectorId: string; label: string; toNodeLabel: string }>;
  } | null>(null);

  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean simulation timers on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
    };
  }, []);

  // Node Movement Handler
  const handleMoveNode = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, x, y } : node))
    );
  }, []);

  // Multi-Node Movement Handler
  const handleMoveNodes = useCallback(
    (moves: Array<{ id: string; x: number; y: number }>) => {
      const moveMap = new Map(moves.map((m) => [m.id, m]));
      setNodes((prev) =>
        prev.map((node) => {
          const move = moveMap.get(node.id);
          return move ? { ...node, x: move.x, y: move.y } : node;
        })
      );
    },
    []
  );

  // Node Resizing Handler (Draw.io 8-point handles)
  const handleResizeNode = useCallback(
    (id: string, x: number, y: number, width: number, height: number) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id ? { ...node, x, y, width, height } : node
        )
      );
    },
    []
  );

  const handleResizeEnd = useCallback(() => {
    recordHistory();
  }, [recordHistory]);

  // Z-Order / Layer Management Handlers (Draw.io style)
  const handleBringToFront = useCallback(
    (nodeId: string) => {
      recordHistory();
      setNodes((prev) => {
        const index = prev.findIndex((n) => n.id === nodeId);
        if (index === -1 || index === prev.length - 1) return prev;
        const target = prev[index];
        const next = prev.filter((n) => n.id !== nodeId);
        next.push(target);
        return next;
      });
    },
    [recordHistory]
  );

  const handleSendToBack = useCallback(
    (nodeId: string) => {
      recordHistory();
      setNodes((prev) => {
        const index = prev.findIndex((n) => n.id === nodeId);
        if (index === -1 || index === 0) return prev;
        const target = prev[index];
        const next = prev.filter((n) => n.id !== nodeId);
        next.unshift(target);
        return next;
      });
    },
    [recordHistory]
  );

  const handleBringForward = useCallback(
    (nodeId: string) => {
      recordHistory();
      setNodes((prev) => {
        const index = prev.findIndex((n) => n.id === nodeId);
        if (index === -1 || index === prev.length - 1) return prev;
        const next = [...prev];
        const temp = next[index];
        next[index] = next[index + 1];
        next[index + 1] = temp;
        return next;
      });
    },
    [recordHistory]
  );

  const handleSendBackward = useCallback(
    (nodeId: string) => {
      recordHistory();
      setNodes((prev) => {
        const index = prev.findIndex((n) => n.id === nodeId);
        if (index <= 0) return prev;
        const next = [...prev];
        const temp = next[index];
        next[index] = next[index - 1];
        next[index - 1] = temp;
        return next;
      });
    },
    [recordHistory]
  );

  const handleReorderNodes = useCallback(
    (reorderedNodes: FlowNode[]) => {
      recordHistory();
      setNodes(reorderedNodes);
    },
    [recordHistory]
  );

  // Scale Single Node by factor
  const handleScaleNode = useCallback(
    (nodeId: string, factor: number) => {
      recordHistory();
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId) return n;
          const newW = Math.max(60, Math.round(n.width * factor));
          const newH = Math.max(40, Math.round(n.height * factor));
          const dx = (newW - n.width) / 2;
          const dy = (newH - n.height) / 2;
          return {
            ...n,
            x: Math.round(n.x - dx),
            y: Math.round(n.y - dy),
            width: newW,
            height: newH,
          };
        })
      );
    },
    [recordHistory]
  );

  // Auto-fit Node to Text
  const handleFitNodeText = useCallback(
    (nodeId: string) => {
      recordHistory();
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId) return n;
          const labelLen = n.label.length;
          const subLen = n.subLabel ? n.subLabel.length : 0;
          const estWidth = Math.max(120, Math.max(labelLen * 9, subLen * 7.5) + 40);
          const estHeight = subLen > 0 ? 76 : 56;
          return {
            ...n,
            width: Math.round(estWidth),
            height: Math.round(estHeight),
          };
        })
      );
    },
    [recordHistory]
  );

  // Diagram Scaling (Draw.io feature: Perbesar / Perkecil Diagram Flowchart)
  const handleScaleDiagram = useCallback(
    (factor: number, scalePositions: boolean, selectedOnly: boolean) => {
      recordHistory();
      const targetNodes =
        selectedOnly && selectedNodeId
          ? nodes.filter((n) => n.id === selectedNodeId)
          : nodes;

      if (targetNodes.length === 0) return;

      const bounds = getDiagramBounds(targetNodes);
      const centerX = bounds.minX + bounds.width / 2;
      const centerY = bounds.minY + bounds.height / 2;

      setNodes((prev) =>
        prev.map((node) => {
          const isTarget =
            selectedOnly && selectedNodeId ? node.id === selectedNodeId : true;
          if (!isTarget) return node;

          const newW = Math.max(50, Math.round(node.width * factor));
          const newH = Math.max(35, Math.round(node.height * factor));

          let newX = node.x;
          let newY = node.y;

          if (scalePositions) {
            newX = Math.round(centerX + (node.x - centerX) * factor);
            newY = Math.round(centerY + (node.y - centerY) * factor);
          } else {
            newX = Math.round(node.x - (newW - node.width) / 2);
            newY = Math.round(node.y - (newH - node.height) / 2);
          }

          return {
            ...node,
            x: newX,
            y: newY,
            width: newW,
            height: newH,
          };
        })
      );
    },
    [nodes, selectedNodeId, recordHistory]
  );

  // Add Connector Handler
  const handleAddConnector = useCallback(
    (fromNodeId: string, fromPort: PortPosition, toNodeId: string, toPort: PortPosition) => {
      if (fromNodeId === toNodeId) return;

      // Avoid duplicate connector between same ports
      const exists = connectors.some(
        (c) =>
          c.fromNodeId === fromNodeId &&
          c.fromPort === fromPort &&
          c.toNodeId === toNodeId &&
          c.toPort === toPort
      );
      if (exists) return;

      recordHistory();
      const newConn: FlowConnector = {
        id: `conn-${Date.now()}`,
        fromNodeId,
        fromPort,
        toNodeId,
        toPort,
        type: activeConnectorType,
        strokeColor: '#38bdf8',
        strokeWidth: 2,
        strokeStyle: 'solid',
        animated: true,
        arrowEnd: true,
        arrowStart: false,
      };

      setConnectors((prev) => [...prev, newConn]);
      setSelectedConnectorId(newConn.id);
      setSelectedNodeId(null);
    },
    [connectors, activeConnectorType, recordHistory]
  );

  // Add Shape at Coordinates or Canvas Center
  const handleAddShape = useCallback(
    (type: ShapeType, x?: number, y?: number) => {
      recordHistory();

      const viewportWidth = window.innerWidth - 320 - 256;
      const viewportHeight = window.innerHeight - 56;
      const defaultX = x ?? (-canvasState.pan.x + viewportWidth / 2) / canvasState.zoom - 90;
      const defaultY = y ?? (-canvasState.pan.y + viewportHeight / 2) / canvasState.zoom - 35;

      const shapeDefaults: Record<
        ShapeType,
        {
          width: number;
          height: number;
          label: string;
          subLabel?: string;
          fill: string;
          stroke: string;
          rounded: number;
          shadow: any;
        }
      > = {
        terminator: {
          width: 160,
          height: 58,
          label: 'Start / End',
          subLabel: 'Flow boundary',
          fill: '#0f2b1d',
          stroke: '#10b981',
          rounded: 29,
          shadow: 'glow-emerald',
        },
        'start-end': {
          width: 160,
          height: 58,
          label: 'Start / End',
          subLabel: 'Flow boundary',
          fill: '#0f2b1d',
          stroke: '#10b981',
          rounded: 29,
          shadow: 'glow-emerald',
        },
        process: {
          width: 180,
          height: 68,
          label: 'Process Task',
          subLabel: 'Action or step',
          fill: '#1e293b',
          stroke: '#38bdf8',
          rounded: 8,
          shadow: 'none',
        },
        decision: {
          width: 190,
          height: 88,
          label: 'Condition / Decision?',
          subLabel: 'Yes / No evaluation',
          fill: '#2b1e3a',
          stroke: '#f59e0b',
          rounded: 0,
          shadow: 'subtle',
        },
        'input-output': {
          width: 180,
          height: 64,
          label: 'Input / Output',
          subLabel: 'Data I/O result',
          fill: '#172554',
          stroke: '#60a5fa',
          rounded: 6,
          shadow: 'none',
        },
        document: {
          width: 180,
          height: 72,
          label: 'Document Report',
          subLabel: 'Print / Invoice',
          fill: '#0f2d3a',
          stroke: '#2dd4bf',
          rounded: 6,
          shadow: 'none',
        },
        multidocument: {
          width: 180,
          height: 76,
          label: 'Multi-Document',
          subLabel: 'Batch documents',
          fill: '#132e35',
          stroke: '#14b8a6',
          rounded: 6,
          shadow: 'none',
        },
        'predefined-process': {
          width: 180,
          height: 70,
          label: 'Sub-Procedure',
          subLabel: 'External module',
          fill: '#231834',
          stroke: '#a855f7',
          rounded: 6,
          shadow: 'glow-violet',
        },
        subprocess: {
          width: 180,
          height: 70,
          label: 'Sub-Procedure',
          subLabel: 'External module',
          fill: '#231834',
          stroke: '#a855f7',
          rounded: 6,
          shadow: 'glow-violet',
        },
        connector: {
          width: 64,
          height: 64,
          label: 'A',
          subLabel: 'On-Page',
          fill: '#1e293b',
          stroke: '#94a3b8',
          rounded: 32,
          shadow: 'none',
        },
        'offpage-connector': {
          width: 80,
          height: 72,
          label: 'Pg 2',
          subLabel: 'Off-Page',
          fill: '#1e1b4b',
          stroke: '#818cf8',
          rounded: 4,
          shadow: 'none',
        },
        'manual-input': {
          width: 180,
          height: 68,
          label: 'Manual Input',
          subLabel: 'Keyboard / Form',
          fill: '#2a1720',
          stroke: '#fb7185',
          rounded: 4,
          shadow: 'none',
        },
        'manual-operation': {
          width: 180,
          height: 68,
          label: 'Manual Operation',
          subLabel: 'Physical activity',
          fill: '#2e1c14',
          stroke: '#fb923c',
          rounded: 4,
          shadow: 'none',
        },
        preparation: {
          width: 180,
          height: 68,
          label: 'Initialize Values',
          subLabel: 'Variable setup',
          fill: '#172e26',
          stroke: '#34d399',
          rounded: 4,
          shadow: 'none',
        },
        delay: {
          width: 170,
          height: 64,
          label: 'Delay / Wait',
          subLabel: 'Wait duration',
          fill: '#2a1e17',
          stroke: '#fb923c',
          rounded: 12,
          shadow: 'none',
        },
        database: {
          width: 180,
          height: 74,
          label: 'Database Storage',
          subLabel: 'Data tables repository',
          fill: '#1a1f38',
          stroke: '#818cf8',
          rounded: 8,
          shadow: 'none',
        },
        display: {
          width: 180,
          height: 68,
          label: 'UI Display',
          subLabel: 'Screen monitor / UI',
          fill: '#14273e',
          stroke: '#38bdf8',
          rounded: 6,
          shadow: 'glow-cyan',
        },
        cloud: {
          width: 190,
          height: 76,
          label: 'Cloud Service API',
          subLabel: 'External webhook',
          fill: '#0c2e3a',
          stroke: '#0ea5e9',
          rounded: 16,
          shadow: 'glow-cyan',
        },
        note: {
          width: 170,
          height: 70,
          label: 'Sticky Note',
          subLabel: 'Annotation / note',
          fill: '#292524',
          stroke: '#eab308',
          rounded: 4,
          shadow: 'none',
        },
      };

      const def = shapeDefaults[type];
      const newNode: FlowNode = {
        id: `node-${Date.now()}`,
        type,
        x: Math.round(defaultX),
        y: Math.round(defaultY),
        width: def.width,
        height: def.height,
        label: def.label,
        subLabel: def.subLabel,
        fillColor: def.fill,
        strokeColor: def.stroke,
        strokeWidth: 2,
        strokeStyle: 'solid',
        textColor: '#f8fafc',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        rounded: def.rounded,
        shadow: def.shadow,
      };

      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setSelectedConnectorId(null);
    },
    [canvasState.pan, canvasState.zoom, recordHistory]
  );

  // Add Custom Shape (from Custom Shapes Modal / AI Generator)
  const handleAddCustomShape = useCallback(
    (shapeDef: Partial<FlowNode>) => {
      recordHistory();
      const viewportWidth = window.innerWidth - 320 - 256;
      const viewportHeight = window.innerHeight - 56;
      const defaultX = (-canvasState.pan.x + viewportWidth / 2) / canvasState.zoom - (shapeDef.width || 180) / 2;
      const defaultY = (-canvasState.pan.y + viewportHeight / 2) / canvasState.zoom - (shapeDef.height || 70) / 2;

      const newNode: FlowNode = {
        id: `node-${Date.now()}`,
        type: shapeDef.type || 'process',
        x: Math.round(defaultX),
        y: Math.round(defaultY),
        width: shapeDef.width || 180,
        height: shapeDef.height || 70,
        label: shapeDef.label || 'Custom Shape',
        subLabel: shapeDef.subLabel,
        fillColor: shapeDef.fillColor || '#1e293b',
        strokeColor: shapeDef.strokeColor || '#38bdf8',
        strokeWidth: shapeDef.strokeWidth || 2,
        strokeStyle: shapeDef.strokeStyle || 'solid',
        textColor: shapeDef.textColor || '#f8fafc',
        fontSize: shapeDef.fontSize || 13,
        fontWeight: shapeDef.fontWeight || 'bold',
        textAlign: 'center',
        rounded: shapeDef.rounded || 10,
        shadow: shapeDef.shadow || 'none',
        customSvgPath: shapeDef.customSvgPath,
        customIcon: shapeDef.customIcon,
      };

      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setSelectedConnectorId(null);
    },
    [canvasState.pan, canvasState.zoom, recordHistory]
  );

  // Update Node Properties
  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<FlowNode>) => {
      recordHistory();
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n))
      );
    },
    [recordHistory]
  );

  // Delete Node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      recordHistory();
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setConnectors((prev) =>
        prev.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId)
      );
      setSelectedNodeId(null);
      setSelectedNodeIds((prev) => prev.filter((id) => id !== nodeId));
    },
    [recordHistory]
  );

  // Delete Multiple Nodes (Multi-Selection / Section All)
  const handleDeleteMultipleNodes = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      recordHistory();
      const idsSet = new Set(nodeIds);
      setNodes((prev) => prev.filter((n) => !idsSet.has(n.id)));
      setConnectors((prev) =>
        prev.filter((c) => !idsSet.has(c.fromNodeId) && !idsSet.has(c.toNodeId))
      );
      setSelectedNodeIds([]);
      setSelectedNodeId(null);
    },
    [recordHistory]
  );

  // Duplicate Node
  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const source = nodes.find((n) => n.id === nodeId);
      if (!source) return;

      recordHistory();
      const clone: FlowNode = {
        ...source,
        id: `node-${Date.now()}`,
        x: source.x + 30,
        y: source.y + 30,
        label: `${source.label} (Copy)`,
      };

      setNodes((prev) => [...prev, clone]);
      setSelectedNodeId(clone.id);
      setSelectedNodeIds([clone.id]);
    },
    [nodes, recordHistory]
  );

  // Duplicate Multiple Nodes
  const handleDuplicateMultipleNodes = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      const toDuplicate = nodes.filter((n) => nodeIds.includes(n.id));
      if (toDuplicate.length === 0) return;

      recordHistory();
      const idMap = new Map<string, string>();
      const now = Date.now();
      const newNodes: FlowNode[] = toDuplicate.map((source, idx) => {
        const newId = `node-${now}-${idx}`;
        idMap.set(source.id, newId);
        return {
          ...source,
          id: newId,
          x: source.x + 30,
          y: source.y + 30,
          label: `${source.label} (Copy)`,
        };
      });

      // Duplicate connectors between duplicated nodes
      const internalConnectors = connectors.filter(
        (c) => idMap.has(c.fromNodeId) && idMap.has(c.toNodeId)
      );
      const newConnectors: FlowConnector[] = internalConnectors.map((c, idx) => ({
        ...c,
        id: `conn-${now}-${idx}`,
        fromNodeId: idMap.get(c.fromNodeId)!,
        toNodeId: idMap.get(c.toNodeId)!,
      }));

      setNodes((prev) => [...prev, ...newNodes]);
      setConnectors((prev) => [...prev, ...newConnectors]);
      const newIds = newNodes.map((n) => n.id);
      setSelectedNodeIds(newIds);
      setSelectedNodeId(newIds[newIds.length - 1]);
    },
    [nodes, connectors, recordHistory]
  );

  // Multi-Node Align Handler
  const handleAlignNodes = useCallback(
    (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedNodeIds.length < 2) return;
      const targets = nodes.filter((n) => selectedNodeIds.includes(n.id));
      if (targets.length < 2) return;
      recordHistory();

      const minX = Math.min(...targets.map((n) => n.x));
      const maxX = Math.max(...targets.map((n) => n.x + n.width));
      const minY = Math.min(...targets.map((n) => n.y));
      const maxY = Math.max(...targets.map((n) => n.y + n.height));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setNodes((prev) =>
        prev.map((node) => {
          if (!selectedNodeIds.includes(node.id)) return node;
          switch (direction) {
            case 'left':
              return { ...node, x: minX };
            case 'right':
              return { ...node, x: maxX - node.width };
            case 'center':
              return { ...node, x: Math.round(centerX - node.width / 2) };
            case 'top':
              return { ...node, y: minY };
            case 'bottom':
              return { ...node, y: maxY - node.height };
            case 'middle':
              return { ...node, y: Math.round(centerY - node.height / 2) };
            default:
              return node;
          }
        })
      );
    },
    [nodes, selectedNodeIds, recordHistory]
  );

  // Multi-Node Distribute Handler
  const handleDistributeNodes = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      if (selectedNodeIds.length < 3) return;
      const targets = nodes.filter((n) => selectedNodeIds.includes(n.id));
      if (targets.length < 3) return;
      recordHistory();

      if (direction === 'horizontal') {
        const sorted = [...targets].sort((a, b) => a.x - b.x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalGap = last.x - (first.x + first.width);
        const intermediateWidths = sorted
          .slice(1, -1)
          .reduce((sum, n) => sum + n.width, 0);
        const gap = Math.max(20, (totalGap - intermediateWidths) / (sorted.length - 1));

        let curX = first.x + first.width + gap;
        const newPosMap = new Map<string, number>();
        for (let i = 1; i < sorted.length - 1; i++) {
          newPosMap.set(sorted[i].id, Math.round(curX));
          curX += sorted[i].width + gap;
        }

        setNodes((prev) =>
          prev.map((n) =>
            newPosMap.has(n.id) ? { ...n, x: newPosMap.get(n.id)! } : n
          )
        );
      } else {
        const sorted = [...targets].sort((a, b) => a.y - b.y);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalGap = last.y - (first.y + first.height);
        const intermediateHeights = sorted
          .slice(1, -1)
          .reduce((sum, n) => sum + n.height, 0);
        const gap = Math.max(20, (totalGap - intermediateHeights) / (sorted.length - 1));

        let curY = first.y + first.height + gap;
        const newPosMap = new Map<string, number>();
        for (let i = 1; i < sorted.length - 1; i++) {
          newPosMap.set(sorted[i].id, Math.round(curY));
          curY += sorted[i].height + gap;
        }

        setNodes((prev) =>
          prev.map((n) =>
            newPosMap.has(n.id) ? { ...n, y: newPosMap.get(n.id)! } : n
          )
        );
      }
    },
    [nodes, selectedNodeIds, recordHistory]
  );

  // Multi-Node Bulk Update Handler (Color, Font, Style)
  const handleUpdateNodes = useCallback(
    (nodeIds: string[], updates: Partial<FlowNode>) => {
      recordHistory();
      const idsSet = new Set(nodeIds);
      setNodes((prev) =>
        prev.map((n) => (idsSet.has(n.id) ? { ...n, ...updates } : n))
      );
    },
    [recordHistory]
  );

  // Update Connector Properties
  const handleUpdateConnector = useCallback(
    (connId: string, updates: Partial<FlowConnector>) => {
      recordHistory();
      setConnectors((prev) =>
        prev.map((c) => (c.id === connId ? { ...c, ...updates } : c))
      );
    },
    [recordHistory]
  );

  // Delete Connector
  const handleDeleteConnector = useCallback(
    (connId: string) => {
      recordHistory();
      setConnectors((prev) => prev.filter((c) => c.id !== connId));
      setSelectedConnectorId(null);
    },
    [recordHistory]
  );

  // Duplicate Connector
  const handleDuplicateConnector = useCallback(
    (connId: string) => {
      const target = connectors.find((c) => c.id === connId);
      if (!target) return;
      recordHistory();
      const clone: FlowConnector = {
        ...target,
        id: `conn-${Date.now()}`,
        label: target.label ? `${target.label} (Copy)` : undefined,
      };
      setConnectors((prev) => [...prev, clone]);
      setSelectedConnectorId(clone.id);
    },
    [connectors, recordHistory]
  );

  // Update Node Label inline
  const handleUpdateNodeLabel = useCallback(
    (nodeId: string, label: string, subLabel?: string) => {
      recordHistory();
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, label, subLabel } : n))
      );
    },
    [recordHistory]
  );

  // Keyboard Shortcuts (Delete, Undo, Redo, Duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Select All (Section All) - Ctrl+A or Cmd+A
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allIds = nodes.map((n) => n.id);
        setSelectedNodeIds(allIds);
        if (allIds.length > 0) {
          setSelectedNodeId(allIds[allIds.length - 1]);
        }
        setSelectedConnectorId(null);
        return;
      }

      // Escape -> Deselect All
      if (e.key === 'Escape') {
        setSelectedNodeIds([]);
        setSelectedNodeId(null);
        setSelectedConnectorId(null);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 1) {
          handleDeleteMultipleNodes(selectedNodeIds);
        } else if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        } else if (selectedConnectorId) {
          handleDeleteConnector(selectedConnectorId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedNodeIds.length > 1) {
          handleDuplicateMultipleNodes(selectedNodeIds);
        } else if (selectedNodeId) {
          handleDuplicateNode(selectedNodeId);
        } else if (selectedConnectorId) {
          handleDuplicateConnector(selectedConnectorId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    nodes,
    selectedNodeId,
    selectedNodeIds,
    selectedConnectorId,
    handleDeleteNode,
    handleDeleteMultipleNodes,
    handleDeleteConnector,
    handleUndo,
    handleRedo,
    handleDuplicateNode,
    handleDuplicateMultipleNodes,
    handleDuplicateConnector,
  ]);

  // ==========================================
  // REAL-TIME WORKFLOW SIMULATION ENGINE
  // ==========================================
  const addLog = useCallback(
    (node: FlowNode, message: string, type: 'info' | 'success' | 'branch' | 'warning') => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const newLog: SimulationLog = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        nodeId: node.id,
        nodeLabel: node.label,
        shapeType: node.type,
        message,
        type,
      };

      setSimulationState((prev) => ({
        ...prev,
        logs: [newLog, ...prev.logs],
      }));
    },
    []
  );

  const resetSimulation = useCallback(() => {
    if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
    setPendingDecision(null);
    setNodes((prev) => prev.map((n) => ({ ...n, executionState: 'idle' })));
    setSimulationState((prev) => ({
      ...prev,
      status: 'idle',
      currentNodeId: null,
      activeConnectorId: null,
      stepCount: 0,
      logs: [],
    }));
  }, []);

  // Bi-directional live code synchronization (flow.io)
  const handleApplyCodeChanges = useCallback((newNodes: FlowNode[], newConnectors: FlowConnector[]) => {
    recordHistory();
    setNodes(newNodes);
    setConnectors(newConnectors);
    setSelectedNodeId(null);
    setSelectedConnectorId(null);
    resetSimulation();
  }, [recordHistory, resetSimulation]);

  // AI Flowchart Generation from on-screen AI Chat Bar
  const handleGenerateFromAIChat = useCallback(
    async (promptText: string) => {
      setIsGeneratingFlowchart(true);
      
      // Add user message to chat
      const userMsg = {
        id: `user-${Date.now()}`,
        role: 'user' as const,
        content: promptText,
        timestamp: Date.now(),
      };
      setAiChatMessages(prev => [...prev, userMsg]);
      
      try {
        const currentDSL = diagramToDSL(nodes, connectors);
        const generatedCode = await generateFlowchartWithLLM(promptText, currentDSL, llmConfig);

        const parsed: ParseResult = dslToDiagram(generatedCode);
        if (!parsed.success || !parsed.nodes || !parsed.connectors) {
          throw new Error(parsed.error || 'AI FlowScript format could not be processed.');
        }

        // Add assistant message with flowchart code to chat
        const assistantMsg = {
          id: `assistant-${Date.now()}`,
          role: 'assistant' as const,
          content: 'Flowchart generated successfully! You can preview the code below or apply it directly to canvas.',
          flowchartCode: generatedCode,
          timestamp: Date.now(),
        };
        setAiChatMessages(prev => [...prev, assistantMsg]);

        recordHistory();
        setNodes(parsed.nodes);
        setConnectors(parsed.connectors);
        setSelectedNodeId(null);
        setSelectedConnectorId(null);
        resetSimulation();

        // Trigger entrance animation for nodes and connectors
        setGenerationAnimationActive(true);
        setTimeout(() => {
          setGenerationAnimationActive(false);
        }, 2500);

        // Center and fit canvas viewport to frame the new flowchart
        setTimeout(() => {
          if (parsed.nodes && parsed.nodes.length > 0) {
            const bounds = getDiagramBounds(parsed.nodes);
            const viewportWidth = window.innerWidth - 320 - 256;
            const viewportHeight = window.innerHeight - 56;

            const scaleX = (viewportWidth - 140) / Math.max(bounds.width, 100);
            const scaleY = (viewportHeight - 140) / Math.max(bounds.height, 100);
            const fitZoom = Math.min(1.15, Math.max(0.45, Math.min(scaleX, scaleY)));

            const centerPanX = (viewportWidth - bounds.width * fitZoom) / 2 - bounds.minX * fitZoom;
            const centerPanY = (viewportHeight - bounds.height * fitZoom) / 2 - bounds.minY * fitZoom;

            setCanvasState((prev) => ({
              ...prev,
              zoom: fitZoom,
              pan: { x: centerPanX, y: centerPanY },
            }));
          }
        }, 120);
      } catch (err: any) {
        // Add error message to chat
        const errorMsg = {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant' as const,
          content: `Error: ${err.message || 'Failed to generate flowchart'}`,
          timestamp: Date.now(),
        };
        setAiChatMessages(prev => [...prev, errorMsg]);
        throw err;
      } finally {
        setIsGeneratingFlowchart(false);
      }
    },
    [nodes, connectors, llmConfig, recordHistory, resetSimulation]
  );

  // Apply Flowchart from AI Chat Code to Canvas
  const handleApplyFlowchartFromChat = useCallback(
    (code: string) => {
      try {
        const parsed: ParseResult = dslToDiagram(code);
        if (!parsed.success || !parsed.nodes || !parsed.connectors) {
          throw new Error(parsed.error || 'Invalid FlowScript code format.');
        }

        recordHistory();
        setNodes(parsed.nodes);
        setConnectors(parsed.connectors);
        setSelectedNodeId(null);
        setSelectedConnectorId(null);
        resetSimulation();

        // Trigger animation
        setGenerationAnimationActive(true);
        setTimeout(() => setGenerationAnimationActive(false), 2500);

        // Center viewport
        setTimeout(() => {
          if (parsed.nodes && parsed.nodes.length > 0) {
            const bounds = getDiagramBounds(parsed.nodes);
            const viewportWidth = window.innerWidth - 320 - 256;
            const viewportHeight = window.innerHeight - 56;

            const scaleX = (viewportWidth - 140) / Math.max(bounds.width, 100);
            const scaleY = (viewportHeight - 140) / Math.max(bounds.height, 100);
            const fitZoom = Math.min(1.15, Math.max(0.45, Math.min(scaleX, scaleY)));

            const centerPanX = (viewportWidth - bounds.width * fitZoom) / 2 - bounds.minX * fitZoom;
            const centerPanY = (viewportHeight - bounds.height * fitZoom) / 2 - bounds.minY * fitZoom;

            setCanvasState((prev) => ({
              ...prev,
              zoom: fitZoom,
              pan: { x: centerPanX, y: centerPanY },
            }));
          }
        }, 120);
      } catch (err: any) {
        alert(`Failed to apply flowchart: ${err.message || 'Unknown error'}`);
      }
    },
    [recordHistory, resetSimulation]
  );

  // Execute Step in Workflow
  const executeStep = useCallback(
    (startNodeId?: string) => {
      if (nodes.length === 0) return;

      let targetNodeId = startNodeId || simulationState.currentNodeId;

      // If no target node, find entry point (start-end node or node with 0 incoming connectors)
      if (!targetNodeId) {
        const startNode =
          nodes.find((n) => n.type === 'start-end') ||
          nodes.find((n) => !connectors.some((c) => c.toNodeId === n.id)) ||
          nodes[0];
        targetNodeId = startNode.id;
      }

      const activeNode = nodes.find((n) => n.id === targetNodeId);
      if (!activeNode) return;

      // 1. Mark node as RUNNING
      setNodes((prev) =>
        prev.map((n) =>
          n.id === activeNode.id
            ? { ...n, executionState: 'running' }
            : n.executionState === 'running'
            ? { ...n, executionState: 'completed' }
            : n
        )
      );

      setSimulationState((prev) => ({
        ...prev,
        status: 'running',
        currentNodeId: activeNode.id,
        activeConnectorId: null,
        stepCount: prev.stepCount + 1,
      }));

      // Log execution
      addLog(activeNode, `Executing active node: "${activeNode.label}"`, 'info');

      // Check outgoing connectors
      const outgoingConns = connectors.filter((c) => c.fromNodeId === activeNode.id);

      // Node delay based on speed
      const baseDelay = 1200 / simulationState.speed;

      simulationTimerRef.current = setTimeout(() => {
        // If End node or no outgoing connectors -> Workflow Complete!
        if (outgoingConns.length === 0 || (activeNode.type === 'start-end' && simulationState.stepCount > 1)) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === activeNode.id ? { ...n, executionState: 'completed' } : n
            )
          );
          setSimulationState((prev) => ({
            ...prev,
            status: 'completed',
            activeConnectorId: null,
          }));
          addLog(activeNode, `Workflow execution completed successfully! 100% finished.`, 'success');
          return;
        }

        // If Decision node with multiple outgoing branches, handle decision choice
        if (activeNode.type === 'decision' && outgoingConns.length > 1) {
          const branches = outgoingConns.map((c) => {
            const dest = nodes.find((n) => n.id === c.toNodeId);
            return {
              connectorId: c.id,
              label: c.label || 'Next',
              toNodeLabel: dest ? dest.label : 'Target Node',
            };
          });

          setPendingDecision({
            nodeId: activeNode.id,
            branches,
          });

          setSimulationState((prev) => ({
            ...prev,
            status: 'paused',
          }));

          addLog(
            activeNode,
            `Awaiting decision branch selection (${branches.map((b) => b.label).join(' / ')})`,
            'branch'
          );
          return;
        }

        // Default: Proceed along the single connector (or first connector)
        const chosenConn = outgoingConns[0];
        proceedAlongConnector(chosenConn, activeNode);
      }, baseDelay);
    },
    [nodes, connectors, simulationState.currentNodeId, simulationState.stepCount, simulationState.speed, addLog]
  );

  // Transition through a chosen connector
  const proceedAlongConnector = useCallback(
    (conn: FlowConnector, fromNode: FlowNode) => {
      const destNode = nodes.find((n) => n.id === conn.toNodeId);
      if (!destNode) return;

      // Mark current node completed
      setNodes((prev) =>
        prev.map((n) =>
          n.id === fromNode.id ? { ...n, executionState: 'completed' } : n
        )
      );

      // Activate connector with glowing pulse
      setSimulationState((prev) => ({
        ...prev,
        activeConnectorId: conn.id,
      }));

      addLog(
        fromNode,
        `Flowing data via [${conn.label || 'Connector'}] to [${destNode.label}]`,
        'branch'
      );

      // Flow duration along connector wire
      const wireDelay = 800 / simulationState.speed;
      simulationTimerRef.current = setTimeout(() => {
        executeStep(destNode.id);
      }, wireDelay);
    },
    [nodes, simulationState.speed, addLog, executeStep]
  );

  // User clicked a branch on Decision Node
  const handleSelectDecisionBranch = useCallback(
    (connectorId: string) => {
      const conn = connectors.find((c) => c.id === connectorId);
      if (!conn) return;
      const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
      if (!fromNode) return;

      setPendingDecision(null);
      setSimulationState((prev) => ({ ...prev, status: 'running' }));
      proceedAlongConnector(conn, fromNode);
    },
    [connectors, nodes, proceedAlongConnector]
  );

  // Play / Pause Simulation
  const handleToggleSimulation = () => {
    if (simulationState.status === 'running') {
      if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
      setSimulationState((prev) => ({ ...prev, status: 'paused' }));
    } else {
      executeStep();
    }
  };

  // Step Forward (1 step)
  const handleStepForward = () => {
    if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
    executeStep();
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (window.confirm('Clear the entire flowchart canvas? This action can be undone using the Undo button.')) {
      recordHistory();
      setNodes([]);
      setConnectors([]);
      setSelectedNodeId(null);
      setSelectedConnectorId(null);
      resetSimulation();
    }
  };

  // Select Template
  const handleSelectTemplate = (template: TemplateDefinition) => {
    recordHistory();
    
    // Generate unique IDs untuk menghindari duplicate keys
    const timestamp = Date.now();
    const nodesWithUniqueIds = template.nodes.map((node, idx) => ({
      ...node,
      id: `${node.id}-${timestamp}-${idx}`,
    }));
    
    const connectorsWithUniqueIds = template.connectors.map((conn, idx) => {
      const fromNode = template.nodes.find(n => n.id === conn.fromNodeId);
      const toNode = template.nodes.find(n => n.id === conn.toNodeId);
      const fromIdx = template.nodes.indexOf(fromNode!);
      const toIdx = template.nodes.indexOf(toNode!);
      
      return {
        ...conn,
        id: `conn-${timestamp}-${idx}`,
        fromNodeId: `${conn.fromNodeId}-${timestamp}-${fromIdx}`,
        toNodeId: `${conn.toNodeId}-${timestamp}-${toIdx}`,
      };
    });
    
    setProjectName(template.name);
    setNodes(nodesWithUniqueIds);
    setConnectors(connectorsWithUniqueIds);
    setSelectedNodeId(null);
    setSelectedConnectorId(null);
    resetSimulation();
    setTimeout(() => {
      handleResetZoom();
    }, 100);
  };

  // New Blank Canvas
  const handleNewBlank = () => {
    recordHistory();
    setProjectName('Untitled Flowchart');
    setNodes([]);
    setConnectors([]);
    setSelectedNodeId(null);
    setSelectedConnectorId(null);
    resetSimulation();
  };

  // Export PNG / JPG / PDF / SVG
  const handleExportPNG = async (format: 'png' | 'jpg' | 'pdf' | 'svg', transparent: boolean, canvasBounds: boolean) => {
    const baseFileName = projectName.toLowerCase().replace(/\s+/g, '-');
    
    if (format === 'pdf') {
      await exportFlowchartToPDF(nodes, connectors, {
        fileName: `${baseFileName}.pdf`,
        transparentBg: transparent,
        scale: 2,
      });
    } else if (format === 'svg') {
      await exportFlowchartToSVG(nodes, connectors, {
        fileName: `${baseFileName}.svg`,
        transparentBg: transparent,
      });
    } else {
      // PNG or JPG
      await exportFlowchartToPNG(nodes, connectors, {
        fileName: `${baseFileName}.${format}`,
        transparentBg: transparent,
        scale: 2,
        format,
        quality: 0.95,
      });
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    exportToJSON(nodes, connectors, projectName);
  };

  // Import JSON
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJSON(file);
      recordHistory();
      if (data.title) setProjectName(data.title);
      setNodes(data.nodes);
      setConnectors(data.connectors);
      setSelectedNodeId(null);
      setSelectedConnectorId(null);
      resetSimulation();
      setTimeout(handleResetZoom, 100);
    } catch (err: any) {
      alert(`Failed to load file: ${err.message}`);
    }
    e.target.value = '';
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedConnector = connectors.find((c) => c.id === selectedConnectorId) || null;
  const currentNode = nodes.find((n) => n.id === simulationState.currentNodeId) || null;

  return (
    <div id="flowchart-app-root" className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* Top Application Toolbar */}
      <Toolbar
        projectName={projectName}
        onUpdateProjectName={setProjectName}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canvasState={canvasState}
        onUpdateCanvasState={handleUpdateCanvasState}
        onResetZoom={handleResetZoom}
        onExportPNG={() => setIsExportModalOpen(true)}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        onOpenCodePreview={() => setIsCodeModalOpen(true)}
        onOpenLLMSettings={() => setIsLLMSettingsOpen(true)}
        onClearCanvas={handleClearCanvas}
        isSimulating={simulationState.status === 'running'}
        onToggleSimulation={handleToggleSimulation}
        onResetSimulation={resetSimulation}
        nodeCount={nodes.length}
        connectorCount={connectors.length}
        onOpenLayersPanel={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
        onOpenScaleModal={() => setIsScaleModalOpen(true)}
        isLayersOpen={isLayersPanelOpen}
        onSetZoom={(z) => setCanvasState((prev) => ({ ...prev, zoom: z }))}
        isLeftSidebarOpen={isLeftSidebarOpen}
        onToggleLeftSidebar={() => setIsLeftSidebarOpen((prev) => !prev)}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={() => setIsRightSidebarOpen((prev) => !prev)}
        isAIChatBarOpen={isAIChatBarOpen}
        onToggleAIChatBar={() => setIsAIChatBarOpen((prev) => !prev)}
        onOpenMoreShapes={() => setIsMoreShapesModalOpen(true)}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        isHistoryOpen={isHistoryDrawerOpen}
        historyCount={canvasHistoryCount}
      />

      {/* Main Workspace: Left Palette + Center Canvas + Right Inspector */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile Backdrop for Left Sidebar */}
        {isLeftSidebarOpen && (
          <div
            onClick={() => setIsLeftSidebarOpen(false)}
            className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-35 md:hidden"
          />
        )}

        {/* Left Toolbox Palette */}
        <LeftSidebar
          isOpen={isLeftSidebarOpen}
          onToggleOpen={() => setIsLeftSidebarOpen((prev) => !prev)}
          onClose={() => setIsLeftSidebarOpen(false)}
          onAddShape={(type) => handleAddShape(type)}
          activeConnectorType={activeConnectorType}
          onChangeConnectorType={setActiveConnectorType}
        />

        {/* Center Interactive Canvas */}
        <FlowCanvas
          nodes={nodes}
          connectors={connectors}
          canvasState={canvasState}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          selectedConnectorId={selectedConnectorId}
          activeConnectorId={simulationState.activeConnectorId}
          pulseProgress={simulationState.pulseProgress}
          isGenerating={isGeneratingFlowchart}
          generationAnimationActive={generationAnimationActive}
          onSelectNode={(id) => {
            setSelectedNodeId(id);
            setSelectedNodeIds(id ? [id] : []);
            if (id) setSelectedConnectorId(null);
          }}
          onSelectNodes={(ids) => {
            setSelectedNodeIds(ids);
            setSelectedNodeId(ids.length > 0 ? ids[ids.length - 1] : null);
            if (ids.length > 0) setSelectedConnectorId(null);
          }}
          onSelectConnector={(id) => {
            setSelectedConnectorId(id);
            if (id) {
              setSelectedNodeId(null);
              setSelectedNodeIds([]);
            }
          }}
          onMoveNode={handleMoveNode}
          onMoveNodes={handleMoveNodes}
          onAddConnector={handleAddConnector}
          onAddShapeAt={(type, x, y) => handleAddShape(type, x, y)}
          onUpdateCanvasState={handleUpdateCanvasState}
          onUpdateNodeLabel={handleUpdateNodeLabel}
          onUpdateConnector={handleUpdateConnector}
          onDeleteConnector={handleDeleteConnector}
          onResizeNode={handleResizeNode}
          onResizeEnd={handleResizeEnd}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onDuplicateNode={handleDuplicateNode}
          onDeleteNode={handleDeleteNode}
          onDeleteNodes={handleDeleteMultipleNodes}
          onScaleNode={handleScaleNode}
          onFitNodeText={handleFitNodeText}
          onResetZoom={handleResetZoom}
          onFitDiagram={handleResetZoom}
          onOpenLayers={() => setIsLayersPanelOpen(true)}
          onOpenScaleModal={() => setIsScaleModalOpen(true)}
        />

        {/* Draw.io Layers & Z-Order Management Panel */}
        <LayersPanel
          isOpen={isLayersPanelOpen}
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onClose={() => setIsLayersPanelOpen(false)}
          onSelectNode={(id) => {
            setSelectedNodeId(id);
            setSelectedNodeIds(id ? [id] : []);
            setSelectedConnectorId(null);
          }}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onReorderNodes={handleReorderNodes}
          onDeleteNode={handleDeleteNode}
          onScaleDiagram={(factor, onlySelected) =>
            handleScaleDiagram(factor, true, !!onlySelected)
          }
        />

        {/* Mobile Backdrop for Right Sidebar */}
        {isRightSidebarOpen && (
          <div
            onClick={() => setIsRightSidebarOpen(false)}
            className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-35 md:hidden"
          />
        )}

        {/* Right Inspector & AI Bot Chat Panel */}
        <RightSidebar
          isOpen={isRightSidebarOpen}
          onToggleOpen={() => setIsRightSidebarOpen((prev) => !prev)}
          onClose={() => setIsRightSidebarOpen(false)}
          selectedNode={selectedNode}
          selectedNodes={nodes.filter((n) => selectedNodeIds.includes(n.id))}
          selectedNodeIds={selectedNodeIds}
          selectedConnector={selectedConnector}
          canvasState={canvasState}
          onUpdateNode={handleUpdateNode}
          onUpdateNodes={handleUpdateNodes}
          onDeleteNode={handleDeleteNode}
          onDeleteNodes={handleDeleteMultipleNodes}
          onDuplicateNode={handleDuplicateNode}
          onAlignNodes={handleAlignNodes}
          onDistributeNodes={handleDistributeNodes}
          onUpdateConnector={handleUpdateConnector}
          onDeleteConnector={handleDeleteConnector}
          onDuplicateConnector={handleDuplicateConnector}
          onUpdateCanvasState={handleUpdateCanvasState}
          nodeCount={nodes.length}
          connectorCount={connectors.length}
          llmConfig={llmConfig}
          allNodes={nodes}
          allConnectors={connectors}
          onApplyGeneratedCode={handleApplyCodeChanges}
        />

        {/* Floating Simulation Controls */}
        <SimulationController
          simulationState={simulationState}
          onPlay={handleToggleSimulation}
          onPause={handleToggleSimulation}
          onStepForward={handleStepForward}
          onReset={resetSimulation}
          onChangeSpeed={(s) =>
            setSimulationState((prev) => ({ ...prev, speed: s }))
          }
          onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
          isConsoleOpen={isConsoleOpen}
          currentNode={currentNode}
          decisionBranches={pendingDecision ? pendingDecision.branches : null}
          onSelectDecisionBranch={handleSelectDecisionBranch}
        />

        {/* Real-time Execution Console Drawer */}
        <ExecutionConsole
          isOpen={isConsoleOpen}
          onClose={() => setIsConsoleOpen(false)}
          logs={simulationState.logs}
          onClearLogs={() =>
            setSimulationState((prev) => ({ ...prev, logs: [] }))
          }
        />
      </div>

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        onNewBlank={handleNewBlank}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectName={projectName}
        onExport={handleExportPNG}
      />

      {/* Project Code Editor (FlowScript DSL) */}
      <ProjectCodeEditor
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        nodes={nodes}
        connectors={connectors}
        onApplyChanges={handleApplyCodeChanges}
      />

      {/* AI & LLM Settings Modal (Gemini, OpenAI, Claude, Local Endpoint) */}
      <LLMSettingsModal
        isOpen={isLLMSettingsOpen}
        onClose={() => setIsLLMSettingsOpen(false)}
        config={llmConfig}
        onSaveConfig={handleSaveLLMConfig}
      />

      {/* Draw.io Scale Diagram Modal (Perbesar / Perkecil Diagram Flowchart) */}
      <ScaleDiagramModal
        isOpen={isScaleModalOpen}
        onClose={() => setIsScaleModalOpen(false)}
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        selectedNodeCount={selectedNodeId ? 1 : 0}
        totalNodeCount={nodes.length}
        onApplyScale={(factor, onlySelected) =>
          handleScaleDiagram(factor, true, onlySelected)
        }
        onScaleDiagram={handleScaleDiagram}
      />

      {/* Custom Shapes, Designer & AI Shape Generator Modal */}
      <CustomShapesModal
        isOpen={isMoreShapesModalOpen}
        onClose={() => setIsMoreShapesModalOpen(false)}
        onAddShape={handleAddCustomShape}
      />

      {/* On-Screen Project Canvas AI Chat Bar */}
      <CanvasAIChatBar
        isOpen={isAIChatBarOpen}
        onClose={() => setIsAIChatBarOpen(false)}
        onGenerate={handleGenerateFromAIChat}
        isGenerating={isGeneratingFlowchart}
        llmConfig={llmConfig}
        onOpenLLMSettings={() => setIsLLMSettingsOpen(true)}
        onOpenCodeEditor={() => setIsCodeModalOpen(true)}
        nodeCount={nodes.length}
        connectorCount={connectors.length}
        chatMessages={aiChatMessages}
        onApplyFlowchart={handleApplyFlowchartFromChat}
      />

      {/* Canvas History & Checkpoints Drawer (1MB LocalStorage Limit) */}
      <CanvasHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => {
          setIsHistoryDrawerOpen(false);
          setCanvasHistoryCount(getCanvasHistory().length);
        }}
        projectName={projectName}
        currentNodes={nodes}
        currentConnectors={connectors}
        onRestoreHistory={handleRestoreHistory}
      />
    </div>
  );
}
