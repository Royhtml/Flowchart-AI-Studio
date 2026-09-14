import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  FlowNode,
  FlowConnector,
  PortPosition,
  CanvasState,
  ShapeType,
  ConnectorType,
} from '../types';
import { CanvasNode } from './CanvasNode';
import { getPortPosition, getConnectorPath, snapToGrid } from '../utils/geometry';
import { Minimap } from './Minimap';
import {
  ArrowLeftRight,
  Trash2,
  Spline,
  GitFork,
  CircleDot,
  Minus,
  Edit2,
  Check,
  Sparkles,
  Loader2,
  Hand,
  RotateCcw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  FileText,
  Palette,
  Sliders,
  X,
  CheckSquare,
} from 'lucide-react';
import { CanvasContextMenu } from './CanvasContextMenu';

interface FlowCanvasProps {
  nodes: FlowNode[];
  connectors: FlowConnector[];
  canvasState: CanvasState;
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  selectedConnectorId: string | null;
  activeConnectorId: string | null;
  pulseProgress: number;
  isGenerating?: boolean;
  generationAnimationActive?: boolean;
  onSelectNode: (id: string | null) => void;
  onSelectNodes?: (ids: string[]) => void;
  onSelectConnector: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onMoveNodes?: (moves: Array<{ id: string; x: number; y: number }>) => void;
  onAddConnector: (fromId: string, fromPort: PortPosition, toId: string, toPort: PortPosition) => void;
  onAddShapeAt: (type: ShapeType, x: number, y: number) => void;
  onUpdateCanvasState: (updates: Partial<CanvasState>) => void;
  onUpdateNodeLabel: (id: string, label: string, subLabel?: string) => void;
  onUpdateConnector?: (id: string, updates: Partial<FlowConnector>) => void;
  onDeleteConnector?: (id: string) => void;
  onResizeNode?: (id: string, x: number, y: number, width: number, height: number) => void;
  onResizeEnd?: () => void;
  onBringToFront?: (nodeId: string) => void;
  onSendToBack?: (nodeId: string) => void;
  onBringForward?: (nodeId: string) => void;
  onSendBackward?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteNodes?: (nodeIds: string[]) => void;
  onScaleNode?: (nodeId: string, factor: number) => void;
  onScaleNodes?: (nodeIds: string[], factor: number) => void;
  onFitNodeText?: (nodeId: string) => void;
  onResetZoom?: () => void;
  onFitDiagram?: () => void;
  onOpenLayers?: () => void;
  onOpenScaleModal?: () => void;
  onAutoArrange?: (direction: 'TB' | 'LR') => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  nodes,
  connectors,
  canvasState,
  selectedNodeId,
  selectedNodeIds = [],
  selectedConnectorId,
  activeConnectorId,
  pulseProgress,
  isGenerating = false,
  generationAnimationActive = false,
  onSelectNode,
  onSelectNodes,
  onSelectConnector,
  onMoveNode,
  onMoveNodes,
  onAddConnector,
  onAddShapeAt,
  onUpdateCanvasState,
  onUpdateNodeLabel,
  onUpdateConnector,
  onDeleteConnector,
  onResizeNode,
  onResizeEnd,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onDuplicateNode,
  onDeleteNode,
  onDeleteNodes,
  onScaleNode,
  onScaleNodes,
  onFitNodeText,
  onResetZoom,
  onFitDiagram,
  onOpenLayers,
  onOpenScaleModal,
  onAutoArrange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Paper sheet customization popover
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);

  // Dragging Node state
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialNodeX: number;
    initialNodeY: number;
  } | null>(null);

  // Dragging multiple nodes state
  const [draggingNodesState, setDraggingNodesState] = useState<{
    startX: number;
    startY: number;
    initialPositions: Record<string, { x: number; y: number }>;
  } | null>(null);

  // Marquee Selection Box state
  const [marquee, setMarquee] = useState<{
    isActive: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startClientX: number;
    startClientY: number;
    hasMoved: boolean;
  } | null>(null);

  // Resizing Node state (Draw.io 8-point handles)
  const [resizingNode, setResizingNode] = useState<{
    id: string;
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    startX: number;
    startY: number;
    initialNodeX: number;
    initialNodeY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  // Right-Click Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    nodeId: string | null;
    nodeLabel?: string;
  } | null>(null);

  // Panning canvas state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Dragging Paper state
  const [draggingPaper, setDraggingPaper] = useState<{
    startX: number;
    startY: number;
    initialPaperX: number;
    initialPaperY: number;
  } | null>(null);

  // Interactive Connecting Wire state
  const [connectingWire, setConnectingWire] = useState<{
    fromNodeId: string;
    fromPort: PortPosition;
    currentMousePos: { x: number; y: number };
  } | null>(null);

  // Inline editing for connector label
  const [editingConnectorLabelId, setEditingConnectorLabelId] = useState<string | null>(null);
  const [tempConnectorLabel, setTempConnectorLabel] = useState('');

  // Ref to track mouse down position and whether background was clicked
  const mouseDownPosRef = useRef<{ clientX: number; clientY: number; isBackground: boolean }>({
    clientX: 0,
    clientY: 0,
    isBackground: false,
  });

  // Space & H/V key tracker for pan & hand mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('contenteditable') === 'true';

      if (isInput) return;

      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
      } else if (e.code === 'KeyH') {
        // Toggle Pan / Drag Canvas Mode
        onUpdateCanvasState({ isPanMode: !canvasState.isPanMode });
      } else if (e.code === 'KeyV') {
        // Return to Select Mode
        if (canvasState.isPanMode) {
          onUpdateCanvasState({ isPanMode: false });
        }
      } else if (e.code === 'Escape') {
        // Deselect everything
        onSelectNode(null);
        onSelectNodes?.([]);
        onSelectConnector(null);
        setEditingConnectorLabelId(null);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed, canvasState.isPanMode, onUpdateCanvasState, onSelectNode, onSelectNodes, onSelectConnector]);

  // Convert Screen/Client coords to Canvas Coords
  const clientToCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - canvasState.pan.x) / canvasState.zoom;
      const y = (clientY - rect.top - canvasState.pan.y) / canvasState.zoom;
      return { x, y };
    },
    [canvasState.pan, canvasState.zoom]
  );

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.min(2.5, Math.max(0.3, canvasState.zoom * zoomFactor));

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = mouseX - (mouseX - canvasState.pan.x) * (newZoom / canvasState.zoom);
    const newPanY = mouseY - (mouseY - canvasState.pan.y) * (newZoom / canvasState.zoom);

    onUpdateCanvasState({
      zoom: newZoom,
      pan: { x: newPanX, y: newPanY },
    });
  };

  // Canvas Mouse Down (Panning, Marquee Box Selection, or Deselect)
  const handleMouseDown = (e: React.MouseEvent) => {
    const targetEl = e.target as HTMLElement;
    const isInteractive = !!targetEl.closest?.(
      '[id^="node-"], .cursor-crosshair, [data-port="true"], .cursor-pointer, [id^="flowchart-minimap"], [id^="layers-panel"], [id^="canvas-quick-hud"], button, input, textarea, a'
    );

    mouseDownPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      isBackground: !isInteractive,
    };

    // 0. Hand Tool / Pan Mode: Left-click directly pans the canvas
    if (canvasState.isPanMode && e.button === 0 && !isInteractive) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasState.pan.x, y: e.clientY - canvasState.pan.y });
      setEditingConnectorLabelId(null);
      return;
    }

    // 1. Middle-click (button 1) or Spacebar held with left-click: Pan Canvas
    if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasState.pan.x, y: e.clientY - canvasState.pan.y });
      setEditingConnectorLabelId(null);
      return;
    }

    // 2. Left-click on canvas background: initiate Marquee Selection Box
    if (e.button === 0 && !isInteractive) {
      const coords = clientToCanvasCoords(e.clientX, e.clientY);
      setMarquee({
        isActive: true,
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
        hasMoved: false,
      });
      setEditingConnectorLabelId(null);
    }
  };

  // Canvas Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    // 0. Resizing Node (Draw.io 8-point handles)
    if (resizingNode) {
      const dx = (e.clientX - resizingNode.startX) / canvasState.zoom;
      const dy = (e.clientY - resizingNode.startY) / canvasState.zoom;

      let newX = resizingNode.initialNodeX;
      let newY = resizingNode.initialNodeY;
      let newWidth = resizingNode.initialWidth;
      let newHeight = resizingNode.initialHeight;

      const minWidth = 60;
      const minHeight = 40;

      switch (resizingNode.handle) {
        case 'e':
          newWidth = Math.max(minWidth, resizingNode.initialWidth + dx);
          break;
        case 'w': {
          const clampedWidth = Math.max(minWidth, resizingNode.initialWidth - dx);
          newX = resizingNode.initialNodeX + (resizingNode.initialWidth - clampedWidth);
          newWidth = clampedWidth;
          break;
        }
        case 's':
          newHeight = Math.max(minHeight, resizingNode.initialHeight + dy);
          break;
        case 'n': {
          const clampedHeight = Math.max(minHeight, resizingNode.initialHeight - dy);
          newY = resizingNode.initialNodeY + (resizingNode.initialHeight - clampedHeight);
          newHeight = clampedHeight;
          break;
        }
        case 'se':
          newWidth = Math.max(minWidth, resizingNode.initialWidth + dx);
          newHeight = Math.max(minHeight, resizingNode.initialHeight + dy);
          if (e.shiftKey) {
            const aspect = resizingNode.initialWidth / resizingNode.initialHeight;
            newHeight = Math.round(newWidth / aspect);
          }
          break;
        case 'sw': {
          const clampedWidth = Math.max(minWidth, resizingNode.initialWidth - dx);
          newX = resizingNode.initialNodeX + (resizingNode.initialWidth - clampedWidth);
          newWidth = clampedWidth;
          newHeight = Math.max(minHeight, resizingNode.initialHeight + dy);
          if (e.shiftKey) {
            const aspect = resizingNode.initialWidth / resizingNode.initialHeight;
            newHeight = Math.round(newWidth / aspect);
          }
          break;
        }
        case 'ne': {
          newWidth = Math.max(minWidth, resizingNode.initialWidth + dx);
          const clampedHeight = Math.max(minHeight, resizingNode.initialHeight - dy);
          newY = resizingNode.initialNodeY + (resizingNode.initialHeight - clampedHeight);
          newHeight = clampedHeight;
          if (e.shiftKey) {
            const aspect = resizingNode.initialWidth / resizingNode.initialHeight;
            newHeight = Math.round(newWidth / aspect);
            newY = resizingNode.initialNodeY + (resizingNode.initialHeight - newHeight);
          }
          break;
        }
        case 'nw': {
          const clampedWidth = Math.max(minWidth, resizingNode.initialWidth - dx);
          newX = resizingNode.initialNodeX + (resizingNode.initialWidth - clampedWidth);
          newWidth = clampedWidth;
          const clampedHeight = Math.max(minHeight, resizingNode.initialHeight - dy);
          newY = resizingNode.initialNodeY + (resizingNode.initialHeight - clampedHeight);
          newHeight = clampedHeight;
          if (e.shiftKey) {
            const aspect = resizingNode.initialWidth / resizingNode.initialHeight;
            newHeight = Math.round(newWidth / aspect);
            newY = resizingNode.initialNodeY + (resizingNode.initialHeight - newHeight);
          }
          break;
        }
      }

      if (canvasState.snapToGrid) {
        newWidth = snapToGrid(newWidth, canvasState.gridSize, true);
        newHeight = snapToGrid(newHeight, canvasState.gridSize, true);
        newX = snapToGrid(newX, canvasState.gridSize, true);
        newY = snapToGrid(newY, canvasState.gridSize, true);
      }

      onResizeNode?.(
        resizingNode.id,
        Math.round(newX),
        Math.round(newY),
        Math.round(newWidth),
        Math.round(newHeight)
      );
      return;
    }

    // 1. Panning
    if (isPanning) {
      onUpdateCanvasState({
        pan: {
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        },
      });
      return;
    }

    // 1.2 Dragging Paper Sheet
    if (draggingPaper) {
      const dx = (e.clientX - draggingPaper.startX) / canvasState.zoom;
      const dy = (e.clientY - draggingPaper.startY) / canvasState.zoom;
      
      const newPaperX = draggingPaper.initialPaperX + dx;
      const newPaperY = draggingPaper.initialPaperY + dy;
      
      onUpdateCanvasState({
        paper: {
          ...canvasState.paper,
          x: newPaperX,
          y: newPaperY,
        },
      });
      return;
    }

    // 1.5 Marquee Box Selection
    if (marquee?.isActive) {
      const coords = clientToCanvasCoords(e.clientX, e.clientY);
      const dist = Math.hypot(e.clientX - marquee.startClientX, e.clientY - marquee.startClientY);
      if (dist > 3 || marquee.hasMoved) {
        const minX = Math.min(marquee.startX, coords.x);
        const maxX = Math.max(marquee.startX, coords.x);
        const minY = Math.min(marquee.startY, coords.y);
        const maxY = Math.max(marquee.startY, coords.y);

        const intersectingNodes = nodes.filter((node) => {
          const nodeRight = node.x + node.width;
          const nodeBottom = node.y + node.height;
          return node.x < maxX && nodeRight > minX && node.y < maxY && nodeBottom > minY;
        });

        const newSelectedIds = intersectingNodes.map((n) => n.id);
        onSelectNodes?.(newSelectedIds);
        if (newSelectedIds.length > 0) {
          onSelectNode(newSelectedIds[newSelectedIds.length - 1]);
        } else {
          onSelectNode(null);
        }
        onSelectConnector(null);

        setMarquee((prev) =>
          prev
            ? {
                ...prev,
                currentX: coords.x,
                currentY: coords.y,
                hasMoved: true,
              }
            : null
        );
      }
      return;
    }

    // 2. Dragging Multiple Nodes simultaneously
    if (draggingNodesState) {
      const dx = (e.clientX - draggingNodesState.startX) / canvasState.zoom;
      const dy = (e.clientY - draggingNodesState.startY) / canvasState.zoom;

      const moves: Array<{ id: string; x: number; y: number }> = [];
      Object.entries(draggingNodesState.initialPositions).forEach(([id, pos]) => {
        let newX = pos.x + dx;
        let newY = pos.y + dy;
        if (canvasState.snapToGrid) {
          newX = snapToGrid(newX, canvasState.gridSize, true);
          newY = snapToGrid(newY, canvasState.gridSize, true);
        }
        moves.push({ id, x: newX, y: newY });
      });

      if (onMoveNodes) {
        onMoveNodes(moves);
      } else {
        moves.forEach((m) => onMoveNode(m.id, m.x, m.y));
      }
      return;
    }

    // 2.5 Dragging Single Node (fallback)
    if (draggingNode) {
      const dx = (e.clientX - draggingNode.startX) / canvasState.zoom;
      const dy = (e.clientY - draggingNode.startY) / canvasState.zoom;

      let newX = draggingNode.initialNodeX + dx;
      let newY = draggingNode.initialNodeY + dy;

      if (canvasState.snapToGrid) {
        newX = snapToGrid(newX, canvasState.gridSize, true);
        newY = snapToGrid(newY, canvasState.gridSize, true);
      }

      onMoveNode(draggingNode.id, newX, newY);
      return;
    }

    // 3. Dragging Connector Wire
    if (connectingWire) {
      const canvasCoord = clientToCanvasCoords(e.clientX, e.clientY);
      setConnectingWire({
        ...connectingWire,
        currentMousePos: canvasCoord,
      });
    }
  };

  // Canvas Mouse Up
  const handleMouseUp = (e?: React.MouseEvent) => {
    setIsPanning(false);
    setDraggingNode(null);
    setDraggingNodesState(null);
    setDraggingPaper(null);
    if (resizingNode) {
      setResizingNode(null);
      onResizeEnd?.();
    }
    if (connectingWire) {
      setConnectingWire(null);
    }

    if (e) {
      const dist = Math.hypot(
        e.clientX - mouseDownPosRef.current.clientX,
        e.clientY - mouseDownPosRef.current.clientY
      );
      // If clicked on canvas background without significant dragging (< 5px) -> remove selection
      if (mouseDownPosRef.current.isBackground && dist < 5) {
        onSelectNode(null);
        onSelectNodes?.([]);
        onSelectConnector(null);
        setEditingConnectorLabelId(null);
      }
    }

    if (marquee?.isActive) {
      if (!marquee.hasMoved) {
        // Simple click on empty canvas -> clear selection
        onSelectNode(null);
        onSelectNodes?.([]);
        onSelectConnector(null);
      }
      setMarquee(null);
    }
  };

  // Start Resizing Node from Handle
  const handleStartResize = (
    e: React.MouseEvent,
    node: FlowNode,
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectNode(node.id);
    onSelectConnector(null);
    setResizingNode({
      id: node.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialNodeX: node.x,
      initialNodeY: node.y,
      initialWidth: node.width,
      initialHeight: node.height,
    });
  };

  // Node Context Menu Trigger
  const handleNodeContextMenu = (e: React.MouseEvent, node: FlowNode) => {
    onSelectNode(node.id);
    onSelectConnector(null);
    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      nodeId: node.id,
      nodeLabel: node.label,
    });
  };

  // Node Drag Start (Multi-selection aware)
  const handleStartDragNode = (e: React.MouseEvent, node: FlowNode) => {
    e.stopPropagation();

    const currentSelected = selectedNodeIds && selectedNodeIds.length > 0
      ? selectedNodeIds
      : (selectedNodeId ? [selectedNodeId] : []);

    const isAlreadySelected = currentSelected.includes(node.id);

    let activeIds: string[] = [];
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      activeIds = isAlreadySelected ? currentSelected : [...currentSelected, node.id];
      onSelectNodes?.(activeIds);
      onSelectNode(node.id);
    } else if (!isAlreadySelected) {
      activeIds = [node.id];
      onSelectNode(node.id);
      onSelectNodes?.([node.id]);
    } else {
      activeIds = currentSelected;
    }

    onSelectConnector(null);
    setEditingConnectorLabelId(null);

    const initialPositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      if (activeIds.includes(n.id)) {
        initialPositions[n.id] = { x: n.x, y: n.y };
      }
    });

    setDraggingNodesState({
      startX: e.clientX,
      startY: e.clientY,
      initialPositions,
    });
  };

  // Start Drawing Connector from a Port
  const handleStartConnect = (nodeId: string, port: PortPosition, e: React.MouseEvent) => {
    const coords = clientToCanvasCoords(e.clientX, e.clientY);
    setConnectingWire({
      fromNodeId: nodeId,
      fromPort: port,
      currentMousePos: coords,
    });
  };

  // Drop on Port to finish connection
  const handlePortMouseUp = (toNodeId: string, toPort: PortPosition) => {
    if (connectingWire && connectingWire.fromNodeId !== toNodeId) {
      onAddConnector(connectingWire.fromNodeId, connectingWire.fromPort, toNodeId, toPort);
      setConnectingWire(null);
    }
  };

  // Drag-and-drop from sidebar onto canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const shapeType = e.dataTransfer.getData('application/flowchart-shape') as ShapeType;
    if (shapeType) {
      const coords = clientToCanvasCoords(e.clientX, e.clientY);
      const x = canvasState.snapToGrid ? snapToGrid(coords.x - 80, canvasState.gridSize, true) : coords.x - 80;
      const y = canvasState.snapToGrid ? snapToGrid(coords.y - 30, canvasState.gridSize, true) : coords.y - 30;
      onAddShapeAt(shapeType, x, y);
    }
  };

  // Helper to reverse connector direction
  const handleReverseConnector = (conn: FlowConnector) => {
    if (!onUpdateConnector) return;
    onUpdateConnector(conn.id, {
      fromNodeId: conn.toNodeId,
      fromPort: conn.toPort,
      toNodeId: conn.fromNodeId,
      toPort: conn.fromPort,
    });
  };

  // Render Arrowhead markers cleanly
  const renderArrowEndMarker = (
    type: string | undefined,
    point: { x: number; y: number },
    port: PortPosition,
    color: string,
    size: number = 8,
    connectorType?: ConnectorType,
    startPoint?: { x: number; y: number }
  ) => {
    if (type === 'none') return null;

    let angle = 0;
    if (connectorType === 'straight' && startPoint) {
      const dx = point.x - startPoint.x;
      const dy = point.y - startPoint.y;
      if (Math.hypot(dx, dy) > 1) {
        angle = Math.atan2(dy, dx);
      } else {
        switch (port) {
          case 'top': angle = Math.PI / 2; break;
          case 'bottom': angle = -Math.PI / 2; break;
          case 'left': angle = 0; break;
          case 'right': angle = Math.PI; break;
        }
      }
    } else {
      switch (port) {
        case 'top': angle = Math.PI / 2; break;
        case 'bottom': angle = -Math.PI / 2; break;
        case 'left': angle = 0; break;
        case 'right': angle = Math.PI; break;
      }
    }

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    if (type === 'circle') {
      return <circle cx={point.x} cy={point.y} r={size * 0.45} fill={color} />;
    }

    if (type === 'diamond') {
      const d = size * 0.7;
      const p1 = `${point.x},${point.y}`;
      const p2 = `${point.x - cos * d + sin * (d * 0.6)},${point.y - sin * d - cos * (d * 0.6)}`;
      const p3 = `${point.x - cos * (d * 2)},${point.y - sin * (d * 2)}`;
      const p4 = `${point.x - cos * d - sin * (d * 0.6)},${point.y - sin * d + cos * (d * 0.6)}`;
      return <polygon points={`${p1} ${p2} ${p3} ${p4}`} fill={color} />;
    }

    if (type === 'triangle') {
      const p1 = `${point.x},${point.y}`;
      const p2 = `${point.x - cos * size + sin * (size * 0.55)},${point.y - sin * size - cos * (size * 0.55)}`;
      const p3 = `${point.x - cos * size - sin * (size * 0.55)},${point.y - sin * size + cos * (size * 0.55)}`;
      return <polygon points={`${p1} ${p2} ${p3}`} fill={color} />;
    }

    // Default: sharp arrow
    const x1 = point.x - cos * size + sin * (size * 0.55);
    const y1 = point.y - sin * size - cos * (size * 0.55);
    const x2 = point.x - cos * size - sin * (size * 0.55);
    const y2 = point.y - sin * size + cos * (size * 0.55);
    return (
      <path
        d={`M ${x1} ${y1} L ${point.x} ${point.y} L ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(2, size * 0.22)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  const renderArrowStartMarker = (
    type: string | undefined,
    point: { x: number; y: number },
    port: PortPosition,
    color: string,
    size: number = 8
  ) => {
    if (!type || type === 'none') return null;

    let angle = 0;
    switch (port) {
      case 'top': angle = -Math.PI / 2; break;
      case 'bottom': angle = Math.PI / 2; break;
      case 'left': angle = Math.PI; break;
      case 'right': angle = 0; break;
    }

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    if (type === 'circle') {
      return <circle cx={point.x} cy={point.y} r={size * 0.45} fill={color} />;
    }

    const p1 = `${point.x},${point.y}`;
    const p2 = `${point.x - cos * size + sin * (size * 0.55)},${point.y - sin * size - cos * (size * 0.55)}`;
    const p3 = `${point.x - cos * size - sin * (size * 0.55)},${point.y - sin * size + cos * (size * 0.55)}`;
    return <polygon points={`${p1} ${p2} ${p3}`} fill={color} />;
  };

  return (
    <div
      ref={containerRef}
      id="flow-canvas-container"
      className={`relative flex-1 h-[calc(100vh-3.5rem)] overflow-hidden bg-[#090d16] select-none ${
        isSpacePressed || isPanning || canvasState.isPanMode
          ? isPanning
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : 'cursor-default'
      }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        const targetEl = e.target as HTMLElement;
        const isInteractive = !!targetEl.closest?.(
          '[id^="node-"], .cursor-crosshair, .cursor-pointer, [id^="flowchart-minimap"], [id^="layers-panel"], [id^="canvas-quick-hud"], button, input, textarea, a'
        );
        if (!isInteractive) {
          onSelectNode(null);
          onSelectNodes?.([]);
          onSelectConnector(null);
          setEditingConnectorLabelId(null);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({
          position: { x: e.clientX, y: e.clientY },
          nodeId: null,
        });
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Background Grid Layer */}
      <div
        id="grid-background"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundPosition: `${canvasState.pan.x}px ${canvasState.pan.y}px`,
          backgroundSize: `${canvasState.gridSize * canvasState.zoom}px ${
            canvasState.gridSize * canvasState.zoom
          }px`,
          backgroundImage:
            canvasState.gridType === 'dots'
              ? `radial-gradient(circle, rgba(148, 163, 184, 0.18) 1.2px, transparent 1.2px)`
              : canvasState.gridType === 'grid'
              ? `linear-gradient(to right, rgba(51, 65, 85, 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(51, 65, 85, 0.22) 1px, transparent 1px)`
              : 'none',
        }}
      />

      {/* Transform Container */}
      <div
        id="canvas-viewport"
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate(${canvasState.pan.x}px, ${canvasState.pan.y}px) scale(${canvasState.zoom})`,
        }}
      >
        {/* Kertas Canvas (Paper Sheet) dengan Garis Putih - Bisa di-Custom & Di-Drag */}
        {canvasState.paper?.showPaper !== false && (
          <div
            id="canvas-paper-sheet"
            className="absolute pointer-events-auto transition-all duration-200 select-none cursor-move group hover:ring-2 hover:ring-cyan-400/30"
            style={{
              left: canvasState.paper?.x ?? 40,
              top: canvasState.paper?.y ?? 40,
              width: canvasState.paper?.width || 1200,
              height: canvasState.paper?.height || 800,
              borderColor: canvasState.paper?.borderColor || '#ffffff',
              borderStyle: canvasState.paper?.borderStyle || 'solid',
              borderWidth: `${canvasState.paper?.borderWidth ?? 2}px`,
              backgroundColor: canvasState.paper?.bgColor || 'rgba(15, 23, 42, 0.45)',
              boxShadow:
                canvasState.paper?.shadow !== false
                  ? '0 25px 60px -15px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.15)'
                  : 'none',
              borderRadius: '6px',
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDraggingPaper({
                startX: e.clientX,
                startY: e.clientY,
                initialPaperX: canvasState.paper?.x ?? 40,
                initialPaperY: canvasState.paper?.y ?? 40,
              });
            }}
          >
            {/* Header / Info Garis Putih Kertas Canvas */}
            <div className="absolute top-2.5 left-3.5 flex items-center gap-2 select-none opacity-75 pointer-events-none">
              <span
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: canvasState.paper?.borderColor || '#ffffff' }}
              />
              <span className="text-[11px] font-mono tracking-wider text-slate-200 font-bold drop-shadow">
                Kertas Canvas ({canvasState.paper?.presetName || `${canvasState.paper?.width || 1200}×${canvasState.paper?.height || 800}px`})
              </span>
            </div>
          </div>
        )}

        {/* SVG Connectors Layer - Positioned 1:1 with Canvas Viewport */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Glow Filters for connectors */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-violet" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render All Connectors */}
          {connectors.map((conn) => {
            const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
            const toNode = nodes.find((n) => n.id === conn.toNodeId);
            if (!fromNode || !toNode) return null;

            const start = getPortPosition(fromNode, conn.fromPort);
            const end = getPortPosition(toNode, conn.toPort);
            const { path, mid } = getConnectorPath(
              start,
              end,
              conn.fromPort,
              conn.toPort,
              conn.type || 'orthogonal',
              conn.curvature
            );

            const isSelected = selectedConnectorId === conn.id;
            const isActiveInSimulation = activeConnectorId === conn.id;

            // Stroke dasharray setup - HANYA untuk dashed atau animated dengan style bukan solid
            let dashArray: string | undefined = undefined;
            let shouldAnimate = false;
            
            if (conn.strokeStyle === 'dashed') {
              // Dashed line: selalu tampilkan dash pattern
              dashArray = '8,5';
              shouldAnimate = conn.animated; // Bisa dianimasikan jika animated true
            } else if (conn.strokeStyle === 'solid') {
              // Solid line: tidak ada dash pattern, tidak ada animasi dash
              dashArray = undefined;
              shouldAnimate = false;
            }

            // Determine line color
            const displayColor = isActiveInSimulation
              ? '#22d3ee'
              : isSelected
              ? '#38bdf8'
              : conn.strokeColor || '#38bdf8';

            // Determine glow filter
            let filterVal: string | undefined = undefined;
            if (isActiveInSimulation) {
              filterVal = 'url(#glow-cyan)';
            } else if (isSelected) {
              filterVal = 'url(#glow-cyan)';
            } else if (conn.glow && conn.glow !== 'none') {
              filterVal = `url(#glow-${conn.glow})`;
            }

            return (
              <g key={conn.id} className="pointer-events-auto group">
                {/* Wide invisible path for easy clicking */}
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="22"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConnector(conn.id);
                    onSelectNode(null);
                  }}
                />

                {/* Outer Selection Highlight Outline */}
                {isSelected && (
                  <path
                    d={path}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={(conn.strokeWidth || 2) + 6}
                    strokeOpacity="0.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Visible Main Connector Line */}
                <path
                  id={`path-${conn.id}`}
                  d={path}
                  fill="none"
                  stroke={displayColor}
                  strokeWidth={isActiveInSimulation ? 3.5 : isSelected ? Math.max(2.5, conn.strokeWidth) : conn.strokeWidth || 2}
                  strokeDasharray={dashArray}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-colors duration-200 cursor-pointer ${
                    shouldAnimate ? 'stroke-dash-animated' : ''
                  }`}
                  filter={filterVal}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConnector(conn.id);
                    onSelectNode(null);
                  }}
                />

                {/* Real-time Workflow Simulation Glowing Pulse Packet along path */}
                {isActiveInSimulation && (
                  <path
                    d={path}
                    fill="none"
                    stroke="#a5f3fc"
                    strokeWidth="5"
                    strokeDasharray="18 160"
                    className="pulse-flow-animation"
                    filter="url(#glow-cyan)"
                  />
                )}

                {/* End Marker Arrow */}
                {conn.arrowEnd !== false &&
                  renderArrowEndMarker(
                    conn.arrowEndType || 'arrow',
                    end,
                    conn.toPort,
                    displayColor,
                    (conn.strokeWidth || 2) * 2.8 + 6,
                    conn.type,
                    start
                  )}

                {/* Start Marker Arrow (if enabled) */}
                {conn.arrowStart &&
                  renderArrowStartMarker(
                    conn.arrowStartType || 'arrow',
                    start,
                    conn.fromPort,
                    displayColor,
                    (conn.strokeWidth || 2) * 2.8 + 6
                  )}

                {/* Selection Handles at Start & End */}
                {isSelected && (
                  <>
                    <circle
                      cx={start.x}
                      cy={start.y}
                      r="4.5"
                      fill="#090d16"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      className="cursor-pointer"
                    />
                    <circle
                      cx={end.x}
                      cy={end.y}
                      r="4.5"
                      fill="#090d16"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      className="cursor-pointer"
                    />
                  </>
                )}

                {/* Connector Label on Path */}
                {conn.label && (
                  <g
                    transform={`translate(${mid.x}, ${mid.y})`}
                    className="cursor-pointer select-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectConnector(conn.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingConnectorLabelId(conn.id);
                      setTempConnectorLabel(conn.label || '');
                    }}
                  >
                    <rect
                      x={-(conn.label.length * 3.8 + 10)}
                      y="-12"
                      width={conn.label.length * 7.6 + 20}
                      height="24"
                      rx="6"
                      fill={conn.labelBgColor || '#0b0f19'}
                      stroke={isActiveInSimulation ? '#22d3ee' : isSelected ? '#38bdf8' : '#334155'}
                      strokeWidth={1.5}
                      className="shadow-lg hover:border-cyan-400 transition-colors"
                    />
                    <text
                      x="0"
                      y="4"
                      fill={isActiveInSimulation ? '#67e8f9' : '#f1f5f9'}
                      fontSize={conn.labelFontSize || 11}
                      fontWeight="600"
                      textAnchor="middle"
                      className="font-sans pointer-events-none"
                    >
                      {conn.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Draft Wire while dragging connector from port */}
          {connectingWire && (
            <g className="pointer-events-none">
              {(() => {
                const sourceNode = nodes.find((n) => n.id === connectingWire.fromNodeId);
                if (!sourceNode) return null;
                const start = getPortPosition(sourceNode, connectingWire.fromPort);
                const end = connectingWire.currentMousePos;
                const { path } = getConnectorPath(start, end, connectingWire.fromPort, 'top', 'curved');

                return (
                  <>
                    <path
                      d={path}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeDasharray="6,4"
                      className="stroke-dash-animated"
                    />
                    <circle cx={end.x} cy={end.y} r="5" fill="#38bdf8" className="animate-pulse" />
                  </>
                );
              })()}
            </g>
          )}
        </svg>

        {/* Marquee Selection Box Overlay (Draw.io marquee box) */}
        {marquee && marquee.hasMoved && (
          <div
            className="absolute border-2 border-cyan-400 bg-cyan-500/15 backdrop-blur-[0.5px] rounded-sm pointer-events-none z-30 transition-none"
            style={{
              left: `${Math.min(marquee.startX, marquee.currentX)}px`,
              top: `${Math.min(marquee.startY, marquee.currentY)}px`,
              width: `${Math.abs(marquee.currentX - marquee.startX)}px`,
              height: `${Math.abs(marquee.currentY - marquee.startY)}px`,
              borderStyle: 'dashed',
            }}
          >
            <div className="absolute -top-8 left-0 px-3 py-1 rounded-lg bg-cyan-950/95 text-cyan-200 text-xs font-bold border-2 border-cyan-500/60 shadow-lg shadow-cyan-900/50 flex items-center gap-2 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-cyan-100">{selectedNodeIds?.length ?? 0} Selected</span>
            </div>
          </div>
        )}

        {/* Nodes Layer - pointer-events-none so clicking empty space deselects nodes */}
        <div id="nodes-layer" className="absolute inset-0 pointer-events-none">
          {nodes.map((node, idx) => (
            <CanvasNode
              key={node.id}
              node={node}
              isSelected={
                selectedNodeIds && selectedNodeIds.length > 0
                  ? selectedNodeIds.includes(node.id)
                  : selectedNodeId === node.id
              }
              isConnectingSource={connectingWire?.fromNodeId === node.id}
              zoom={canvasState.zoom}
              isNewlyGenerated={generationAnimationActive}
              generationIndex={idx}
              onSelect={(e, n) => {
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                  const current =
                    selectedNodeIds && selectedNodeIds.length > 0
                      ? [...selectedNodeIds]
                      : selectedNodeId
                      ? [selectedNodeId]
                      : [];
                  if (current.includes(n.id)) {
                    const next = current.filter((id) => id !== n.id);
                    onSelectNodes?.(next);
                    onSelectNode(next.length > 0 ? next[next.length - 1] : null);
                  } else {
                    const next = [...current, n.id];
                    onSelectNodes?.(next);
                    onSelectNode(n.id);
                  }
                } else {
                  onSelectNode(n.id);
                  onSelectNodes?.([n.id]);
                }
                onSelectConnector(null);
                setEditingConnectorLabelId(null);
              }}
              onStartDrag={handleStartDragNode}
              onStartConnect={handleStartConnect}
              onPortMouseUp={handlePortMouseUp}
              onUpdateLabel={onUpdateNodeLabel}
              onStartResize={handleStartResize}
              onContextMenu={handleNodeContextMenu}
            />
          ))}
        </div>

        {/* Floating Quick Action Mini-Bar for Selected Connector */}
        {selectedConnectorId && (() => {
          const selectedConn = connectors.find((c) => c.id === selectedConnectorId);
          if (!selectedConn) return null;
          const fromNode = nodes.find((n) => n.id === selectedConn.fromNodeId);
          const toNode = nodes.find((n) => n.id === selectedConn.toNodeId);
          if (!fromNode || !toNode) return null;

          const start = getPortPosition(fromNode, selectedConn.fromPort);
          const end = getPortPosition(toNode, selectedConn.toPort);
          const { mid } = getConnectorPath(
            start,
            end,
            selectedConn.fromPort,
            selectedConn.toPort,
            selectedConn.type,
            selectedConn.curvature
          );

          return (
            <div
              className="absolute pointer-events-auto z-40 bg-slate-900/95 border border-slate-700/90 rounded-lg shadow-2xl p-1 flex items-center gap-1 backdrop-blur-md transition-all text-xs"
              style={{
                left: `${mid.x}px`,
                top: `${mid.y + 20}px`,
                transform: 'translate(-50%, 0)',
              }}
            >
              {/* Type Switch Buttons */}
              <button
                onClick={() => onUpdateConnector?.(selectedConn.id, { type: 'orthogonal' })}
                className={`p-1 rounded hover:bg-slate-800 ${
                  selectedConn.type === 'orthogonal' ? 'text-cyan-400 bg-slate-800' : 'text-slate-400'
                }`}
                title="Switch to Right Angle (90°)"
              >
                <GitFork className="w-3.5 h-3.5 rotate-90" />
              </button>
              <button
                onClick={() => onUpdateConnector?.(selectedConn.id, { type: 'smooth-step' })}
                className={`p-1 rounded hover:bg-slate-800 ${
                  selectedConn.type === 'smooth-step' ? 'text-cyan-400 bg-slate-800' : 'text-slate-400'
                }`}
                title="Switch to Smooth Step"
              >
                <CircleDot className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateConnector?.(selectedConn.id, { type: 'curved' })}
                className={`p-1 rounded hover:bg-slate-800 ${
                  selectedConn.type === 'curved' ? 'text-cyan-400 bg-slate-800' : 'text-slate-400'
                }`}
                title="Switch to Curved Bézier"
              >
                <Spline className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateConnector?.(selectedConn.id, { type: 'straight' })}
                className={`p-1 rounded hover:bg-slate-800 ${
                  selectedConn.type === 'straight' ? 'text-cyan-400 bg-slate-800' : 'text-slate-400'
                }`}
                title="Switch to Straight Line"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

              {/* Reverse Direction */}
              <button
                onClick={() => handleReverseConnector(selectedConn)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                title="Reverse Direction (A ⇄ B)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              {/* Edit Label */}
              <button
                onClick={() => {
                  setEditingConnectorLabelId(selectedConn.id);
                  setTempConnectorLabel(selectedConn.label || '');
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                title="Edit Branch Label"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {/* Delete */}
              <button
                onClick={() => onDeleteConnector?.(selectedConn.id)}
                className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                title="Delete Line"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()}

        {/* Modal/Popup for Inline Label Editing */}
        {editingConnectorLabelId && (() => {
          const conn = connectors.find((c) => c.id === editingConnectorLabelId);
          if (!conn) return null;
          const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
          const toNode = nodes.find((n) => n.id === conn.toNodeId);
          if (!fromNode || !toNode) return null;

          const start = getPortPosition(fromNode, conn.fromPort);
          const end = getPortPosition(toNode, conn.toPort);
          const { mid } = getConnectorPath(start, end, conn.fromPort, conn.toPort, conn.type, conn.curvature);

          return (
            <div
              className="absolute pointer-events-auto z-50 bg-slate-900 border border-cyan-500/80 rounded-lg shadow-2xl p-2 flex items-center gap-1.5 backdrop-blur-md"
              style={{
                left: `${mid.x}px`,
                top: `${mid.y - 28}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <input
                autoFocus
                type="text"
                value={tempConnectorLabel}
                onChange={(e) => setTempConnectorLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateConnector?.(conn.id, { label: tempConnectorLabel });
                    setEditingConnectorLabelId(null);
                  } else if (e.key === 'Escape') {
                    setEditingConnectorLabelId(null);
                  }
                }}
                placeholder="Branch label..."
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400 w-32"
              />
              <button
                onClick={() => {
                  onUpdateConnector?.(conn.id, { label: tempConnectorLabel });
                  setEditingConnectorLabelId(null);
                }}
                className="p-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()}
      </div>

      {/* AI Flowchart Generation Scanning & Ripple Animation Overlays */}
      {isGenerating && (
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl shadow-cyan-950/80 animate-in zoom-in-95 duration-200">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 justify-center">
                <span>AI Designing Flowchart</span>
              </h4>
              <p className="text-xs text-cyan-300/80 mt-0.5">
                Synthesizing nodes, logic relations, and spatial layout...
              </p>
            </div>
          </div>
          {/* Animated scanning beam */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 animate-pulse" />
        </div>
      )}

      {generationAnimationActive && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
          {/* Radiant pulse wave */}
          <div className="w-[600px] h-[600px] rounded-full bg-cyan-500/10 border-2 border-cyan-400/40 animate-ping opacity-60" />
        </div>
      )}

      {/* Floating Minimap - Confined to Canvas, Never Overlaps Inspector or Controls */}
      {canvasState.showMinimap && (
        <Minimap
          nodes={nodes}
          connectors={connectors}
          canvasState={canvasState}
          viewportSize={{
            width: containerRef.current ? containerRef.current.clientWidth : 800,
            height: containerRef.current ? containerRef.current.clientHeight : 600,
          }}
          onNavigate={(newPanX, newPanY) => {
            onUpdateCanvasState({ pan: { x: newPanX, y: newPanY } });
          }}
          onClose={() => onUpdateCanvasState({ showMinimap: false })}
        />
      )}

      {/* Live Dimension Tooltip while resizing like Draw.io */}
      {resizingNode && (() => {
        const n = nodes.find((item) => item.id === resizingNode.id);
        if (!n) return null;
        return (
          <div
            className="absolute z-50 pointer-events-none px-2 py-1 rounded bg-slate-900/95 border border-cyan-500 text-cyan-300 font-mono text-[11px] shadow-xl backdrop-blur-md"
            style={{
              left: `${n.x * canvasState.zoom + canvasState.pan.x}px`,
              top: `${(n.y - 28) * canvasState.zoom + canvasState.pan.y}px`,
            }}
          >
            {n.width} × {n.height} px
          </div>
        );
      })()}

      {/* Draw.io Style Right-Click Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          position={contextMenu.position}
          nodeId={contextMenu.nodeId}
          nodeLabel={contextMenu.nodeLabel}
          onClose={() => setContextMenu(null)}
          onBringToFront={onBringToFront}
          onSendToBack={onSendToBack}
          onBringForward={onBringForward}
          onSendBackward={onSendBackward}
          onScaleNode={onScaleNode}
          onDuplicateNode={onDuplicateNode}
          onDeleteNode={onDeleteNode}
          onFitNodeText={onFitNodeText}
          onZoomIn={() => {
            const newZoom = Math.min(2.5, canvasState.zoom * 1.15);
            onUpdateCanvasState({ zoom: newZoom });
          }}
          onZoomOut={() => {
            const newZoom = Math.max(0.3, canvasState.zoom * 0.85);
            onUpdateCanvasState({ zoom: newZoom });
          }}
          onResetZoom={onResetZoom}
          onFitDiagram={onFitDiagram}
          onOpenLayers={onOpenLayers}
          onOpenScaleModal={onOpenScaleModal}
          onAutoArrange={onAutoArrange}
          onSelectAll={() => {
            const allIds = nodes.map((n) => n.id);
            onSelectNodes?.(allIds);
            if (allIds.length > 0) onSelectNode(allIds[allIds.length - 1]);
            onSelectConnector(null);
          }}
          onDeselectAll={() => {
            onSelectNodes?.([]);
            onSelectNode(null);
            onSelectConnector(null);
          }}
        />
      )}

      {/* Multi-Selection Floating Action Bar */}
      {selectedNodeIds && selectedNodeIds.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-cyan-500/60 rounded-xl shadow-2xl p-1.5 px-3 flex items-center gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-100">
              {selectedNodeIds.length} Nodes Selected
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {onScaleNodes && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Scale:</span>
                <button
                  onClick={() => onScaleNodes(selectedNodeIds, 0.9)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors"
                  title="Scale Down 10%"
                >
                  -10%
                </button>
                <button
                  onClick={() => onScaleNodes(selectedNodeIds, 1.1)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors"
                  title="Scale Up 10%"
                >
                  +10%
                </button>
              </div>
            )}
            {onDeleteNodes && (
              <button
                onClick={() => onDeleteNodes(selectedNodeIds)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/50 text-rose-300 text-xs font-medium transition-colors ml-1"
                title="Delete Selected Nodes"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={() => {
                onSelectNodes?.([]);
                onSelectNode(null);
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors ml-0.5"
              title="Batal Pilih / Deselect (Esc)"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Floating Canvas Quick HUD Dock (Pan/Drag Tool, Refresh View, Fit Screen, Zoom) */}
      <div
        id="canvas-quick-hud"
        className="absolute bottom-4 left-4 z-30 flex items-center gap-1 bg-slate-900/95 border border-slate-700/90 rounded-xl p-1 shadow-2xl backdrop-blur-md select-none"
      >
        {/* Hand Tool / Drag Canvas Toggle Button */}
        <button
          id="btn-hud-pan"
          onClick={(e) => {
            e.stopPropagation();
            onUpdateCanvasState({ isPanMode: !canvasState.isPanMode });
          }}
          className={`px-2 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
            canvasState.isPanMode
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.35)] ring-1 ring-cyan-500/40'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
          }`}
          title="Drag / Geser Canvas (Hand Tool - Shortcut H)"
        >
          <Hand className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-medium hidden sm:inline">
            {canvasState.isPanMode ? 'Pan Mode' : 'Hand'}
          </span>
        </button>

        <div className="w-px h-4 bg-slate-800 mx-0.5" />

        {/* Refresh Canvas View Button */}
        <button
          id="btn-hud-refresh"
          onClick={(e) => {
            e.stopPropagation();
            onResetZoom?.();
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
          title="Refresh Canvas View (Center Diagram & Reset Zoom)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Fit Diagram Button */}
        <button
          id="btn-hud-fit"
          onClick={(e) => {
            e.stopPropagation();
            if (onFitDiagram) onFitDiagram();
            else if (onResetZoom) onResetZoom();
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
          title="Fit Diagram to Screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Select All (Section All) Button */}
        <button
          id="btn-hud-select-all"
          onClick={(e) => {
            e.stopPropagation();
            const allIds = nodes.map((n) => n.id);
            onSelectNodes?.(allIds);
            if (allIds.length > 0) {
              onSelectNode(allIds[allIds.length - 1]);
            }
            onSelectConnector(null);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Pilih Semua / Select All (Ctrl+A)"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-0.5" />

        {/* Kertas Canvas (Paper Settings) Button */}
        <button
          id="btn-hud-paper"
          onClick={(e) => {
            e.stopPropagation();
            setIsPaperModalOpen((prev) => !prev);
          }}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            isPaperModalOpen
              ? 'text-cyan-300 bg-slate-800 border border-cyan-500/40'
              : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
          }`}
          title="Kertas Canvas (Ukuran & Garis Putih Kertas)"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-medium hidden sm:inline">Kertas</span>
        </button>

        <div className="w-px h-4 bg-slate-800 mx-0.5" />

        {/* Zoom Out */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateCanvasState({ zoom: Math.max(0.3, canvasState.zoom - 0.15) });
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Zoom Out (Ctrl+-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Percentage */}
        <span className="font-mono text-[10px] text-slate-400 px-1 select-none min-w-[34px] text-center">
          {Math.round(canvasState.zoom * 100)}%
        </span>

        {/* Zoom In */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateCanvasState({ zoom: Math.min(2.5, canvasState.zoom + 0.15) });
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Zoom In (Ctrl++)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Paper Customization Popover */}
      {isPaperModalOpen && (
        <div
          id="paper-config-popover"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 w-84 bg-slate-900/98 border border-slate-700/90 rounded-2xl shadow-2xl p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-slate-200"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-100">Kertas Canvas & Garis Putih</span>
            </div>
            <button
              onClick={() => setIsPaperModalOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 text-xs"
            >
              ✕
            </button>
          </div>

          {/* Toggle Show Paper */}
          <div className="flex items-center justify-between py-1 mb-2.5">
            <span className="text-xs text-slate-300 font-medium">Tampilkan Garis Kertas</span>
            <button
              onClick={() =>
                onUpdateCanvasState({
                  paper: {
                    ...canvasState.paper,
                    showPaper: !(canvasState.paper?.showPaper !== false),
                  },
                })
              }
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                canvasState.paper?.showPaper !== false ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
                  canvasState.paper?.showPaper !== false ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Presets */}
          <div className="space-y-1.5 mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Ukuran Lembar / Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { name: 'Standard', w: 1200, h: 800 },
                { name: 'A4 Landscape', w: 1123, h: 794 },
                { name: 'A4 Portrait', w: 794, h: 1123 },
                { name: 'Full HD 1080p', w: 1920, h: 1080 },
                { name: 'Square 1000', w: 1000, h: 1000 },
              ].map((preset) => {
                const isCurrent =
                  canvasState.paper?.width === preset.w && canvasState.paper?.height === preset.h;
                return (
                  <button
                    key={preset.name}
                    onClick={() =>
                      onUpdateCanvasState({
                        paper: {
                          ...canvasState.paper,
                          width: preset.w,
                          height: preset.h,
                          presetName: `${preset.name} (${preset.w}×${preset.h})`,
                        },
                      })
                    }
                    className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-medium border transition-colors cursor-pointer ${
                      isCurrent
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="truncate">{preset.name}</div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      {preset.w} × {preset.h} px
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Width & Height */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Lebar (px)</label>
              <input
                type="number"
                value={canvasState.paper?.width || 1200}
                onChange={(e) =>
                  onUpdateCanvasState({
                    paper: {
                      ...canvasState.paper,
                      width: Math.max(200, parseInt(e.target.value) || 200),
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Tinggi (px)</label>
              <input
                type="number"
                value={canvasState.paper?.height || 800}
                onChange={(e) =>
                  onUpdateCanvasState({
                    paper: {
                      ...canvasState.paper,
                      height: Math.max(200, parseInt(e.target.value) || 200),
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Border Color */}
          <div className="mb-3">
            <label className="text-[10px] text-slate-400 block mb-1">Warna Garis Kertas</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'Putih', hex: '#ffffff' },
                { label: 'Cyan', hex: '#38bdf8' },
                { label: 'Emerald', hex: '#34d399' },
                { label: 'Amber', hex: '#fbbf24' },
                { label: 'Rose', hex: '#fb7185' },
                { label: 'Slate', hex: '#94a3b8' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() =>
                    onUpdateCanvasState({
                      paper: {
                        ...canvasState.paper,
                        borderColor: c.hex,
                      },
                    })
                  }
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    (canvasState.paper?.borderColor || '#ffffff') === c.hex
                      ? 'scale-110 ring-2 ring-cyan-400 border-white'
                      : 'border-slate-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
              {/* Custom Color Input */}
              <input
                type="color"
                value={canvasState.paper?.borderColor || '#ffffff'}
                onChange={(e) =>
                  onUpdateCanvasState({
                    paper: {
                      ...canvasState.paper,
                      borderColor: e.target.value,
                    },
                  })
                }
                className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                title="Warna Custom"
              />
            </div>
          </div>

          {/* Border Style & Width */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Tipe Garis</label>
              <select
                value={canvasState.paper?.borderStyle || 'solid'}
                onChange={(e) =>
                  onUpdateCanvasState({
                    paper: {
                      ...canvasState.paper,
                      borderStyle: e.target.value as 'solid' | 'dashed',
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-400"
              >
                <option value="solid">Garis Lurus (Solid)</option>
                <option value="dashed">Putus-putus (Dashed)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Ketebalan Garis</label>
              <select
                value={canvasState.paper?.borderWidth ?? 2}
                onChange={(e) =>
                  onUpdateCanvasState({
                    paper: {
                      ...canvasState.paper,
                      borderWidth: parseInt(e.target.value) || 2,
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-400"
              >
                <option value={1}>1 px (Tipis)</option>
                <option value={2}>2 px (Sedang)</option>
                <option value={3}>3 px (Tebal)</option>
                <option value={4}>4 px (Ekstra Tebal)</option>
              </select>
            </div>
          </div>

          {/* Paper Background Color */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Warna Latar Kertas</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { name: 'Gelap Transparan', bg: 'rgba(15, 23, 42, 0.45)' },
                { name: 'Gelap Pekat', bg: '#0b1120' },
                { name: 'Terang', bg: 'rgba(255, 255, 255, 0.92)' },
              ].map((bgOption) => (
                <button
                  key={bgOption.name}
                  onClick={() =>
                    onUpdateCanvasState({
                      paper: {
                        ...canvasState.paper,
                        bgColor: bgOption.bg,
                      },
                    })
                  }
                  className={`px-1.5 py-1 rounded text-[10px] truncate border cursor-pointer ${
                    (canvasState.paper?.bgColor || 'rgba(15, 23, 42, 0.45)') === bgOption.bg
                      ? 'border-cyan-400 text-cyan-300 bg-slate-800'
                      : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {bgOption.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
