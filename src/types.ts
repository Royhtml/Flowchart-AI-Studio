export type ShapeType =
  | 'terminator'
  | 'process'
  | 'decision'
  | 'input-output'
  | 'document'
  | 'multidocument'
  | 'predefined-process'
  | 'connector'
  | 'offpage-connector'
  | 'manual-input'
  | 'manual-operation'
  | 'preparation'
  | 'delay'
  | 'database'
  | 'display'
  | 'start-end'
  | 'subprocess'
  | 'cloud'
  | 'note'
  | 'hexagon'
  | 'star'
  | 'triangle'
  | 'cylinder'
  | 'shield'
  | 'cloud-service'
  | 'callout'
  | 'badge'
  | 'custom';

export type PortPosition = 'top' | 'right' | 'bottom' | 'left';

export type ConnectorType = 'orthogonal' | 'curved' | 'straight' | 'smooth-step';

export type ArrowHeadType = 'arrow' | 'triangle' | 'circle' | 'diamond' | 'none';

export type ConnectorAnimation = 'none' | 'pulse' | 'marching-ants' | 'glow';

export type NodeExecutionState = 'idle' | 'running' | 'completed' | 'skipped' | 'failed';

export interface FlowNode {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  subLabel?: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  textColor: string;
  fontSize: number;
  fontWeight: 'normal' | 'medium' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  rounded: number;
  shadow: 'none' | 'subtle' | 'glow-cyan' | 'glow-emerald' | 'glow-violet' | 'glow-amber';
  executionState?: NodeExecutionState;
  customSvgPath?: string;
  customIcon?: string;
}

export interface StylePreset {
  id: string;
  name: string;
  category?: 'curated' | 'custom';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  textColor: string;
  fontSize: number;
  fontWeight?: 'normal' | 'medium' | 'bold';
  rounded?: number;
  shadow?: 'none' | 'subtle' | 'glow-cyan' | 'glow-emerald' | 'glow-violet' | 'glow-amber';
  borderStyle?: 'solid' | 'dashed';
  roughness?: number;
}

export interface FlowConnector {
  id: string;
  fromNodeId: string;
  fromPort: PortPosition;
  toNodeId: string;
  toPort: PortPosition;
  type: ConnectorType;
  label?: string;
  labelFontSize?: number;
  labelBgColor?: string;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  animated: boolean;
  animationType?: ConnectorAnimation;
  arrowEnd: boolean;
  arrowStart: boolean;
  arrowEndType?: ArrowHeadType;
  arrowStartType?: ArrowHeadType;
  glow?: 'none' | 'cyan' | 'emerald' | 'violet' | 'amber';
  curvature?: number; // 0.1 to 1.0 (default 0.3)
  isActive?: boolean;
}

export interface PaperConfig {
  showPaper: boolean;
  width: number;
  height: number;
  x?: number;  // Position X
  y?: number;  // Position Y
  borderColor: string;
  borderStyle: 'solid' | 'dashed';
  borderWidth: number;
  bgColor: string;
  shadow: boolean;
  presetName?: string;
}

export interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  gridType: 'dots' | 'grid' | 'none';
  snapToGrid: boolean;
  gridSize: number;
  showMinimap: boolean;
  isPanMode?: boolean;
  paper?: PaperConfig;
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeLabel: string;
  shapeType: ShapeType;
  message: string;
  type: 'info' | 'success' | 'branch' | 'warning' | 'error';
}

export interface SimulationState {
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentNodeId: string | null;
  activeConnectorId: string | null;
  speed: number;
  logs: SimulationLog[];
  stepCount: number;
  pulseProgress: number; // 0 to 1 for animated token along connector
  selectedBranchDecision?: string | null;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: FlowNode[];
  connectors: FlowConnector[];
}

export type LLMProvider = 'gemini' | 'openai' | 'claude' | 'custom_local';

export interface LLMConfig {
  provider: LLMProvider;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  claudeApiKey: string;
  claudeModel: string;
  customEndpoint: string; // e.g. http://127.0.0.1:8088/completion
  customApiKey?: string;
  customModel?: string;
  temperature: number;
}
