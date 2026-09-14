import dagre from 'dagre';
import { FlowNode, FlowConnector, PortPosition } from '../types';

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeSep?: number; // horizontal separation between nodes on same rank
  rankSep?: number; // vertical separation between ranks
  margin?: number;
}

/**
 * Automatically arranges flowchart nodes and connectors using Dagre's Sugiyama hierarchical graph algorithm.
 * Solves cluttered, overlapping, or disorganized diagrams.
 */
export function arrangeGraph(
  nodes: FlowNode[],
  connectors: FlowConnector[],
  options: LayoutOptions = {}
): { nodes: FlowNode[]; connectors: FlowConnector[] } {
  if (nodes.length === 0) {
    return { nodes: [], connectors: [] };
  }

  const direction = options.direction || 'TB';
  const nodeSep = options.nodeSep ?? (direction === 'TB' ? 60 : 50);
  const rankSep = options.rankSep ?? (direction === 'TB' ? 80 : 90);
  const margin = options.margin ?? 60;

  // 1. Initialize Dagre directed graph
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    marginx: margin,
    marginy: margin,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // 2. Add each node with its bounding box dimensions
  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: Math.max(node.width, 60),
      height: Math.max(node.height, 40),
    });
  });

  // 3. Add edges from connectors
  connectors.forEach((conn, index) => {
    if (g.hasNode(conn.fromNodeId) && g.hasNode(conn.toNodeId)) {
      g.setEdge(conn.fromNodeId, conn.toNodeId, {}, `e_${index}_${conn.id}`);
    }
  });

  // 4. Run Dagre hierarchical layout calculation
  dagre.layout(g);

  // 5. Map computed centers back to node top-left coordinates
  const updatedNodes: FlowNode[] = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    // Dagre uses center point (x, y); convert to top-left (node.x, node.y)
    const newX = Math.round(dagreNode.x - node.width / 2);
    const newY = Math.round(dagreNode.y - node.height / 2);

    return {
      ...node,
      x: newX,
      y: newY,
    };
  });

  // 6. Automatically optimize connector ports based on relative positions
  const nodeMap = new Map<string, FlowNode>();
  updatedNodes.forEach((n) => nodeMap.set(n.id, n));

  const updatedConnectors: FlowConnector[] = connectors.map((conn) => {
    const fromNode = nodeMap.get(conn.fromNodeId);
    const toNode = nodeMap.get(conn.toNodeId);

    if (!fromNode || !toNode) return conn;

    const fromCenter = { x: fromNode.x + fromNode.width / 2, y: fromNode.y + fromNode.height / 2 };
    const toCenter = { x: toNode.x + toNode.width / 2, y: toNode.y + toNode.height / 2 };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    let optimalFromPort: PortPosition = conn.fromPort;
    let optimalToPort: PortPosition = conn.toPort;

    if (direction === 'TB') {
      if (dy >= 40) {
        // Normal downstream flow
        optimalFromPort = 'bottom';
        optimalToPort = 'top';
      } else if (dy <= -40) {
        // Feedback loop flowing upwards
        optimalFromPort = dx >= 0 ? 'right' : 'left';
        optimalToPort = dx >= 0 ? 'right' : 'left';
      } else {
        // Parallel nodes on same tier
        optimalFromPort = dx >= 0 ? 'right' : 'left';
        optimalToPort = dx >= 0 ? 'left' : 'right';
      }
    } else if (direction === 'LR') {
      if (dx >= 40) {
        // Normal horizontal flow
        optimalFromPort = 'right';
        optimalToPort = 'left';
      } else if (dx <= -40) {
        // Feedback loop
        optimalFromPort = dy >= 0 ? 'bottom' : 'top';
        optimalToPort = dy >= 0 ? 'bottom' : 'top';
      } else {
        // Vertical neighbors
        optimalFromPort = dy >= 0 ? 'bottom' : 'top';
        optimalToPort = dy >= 0 ? 'top' : 'bottom';
      }
    }

    return {
      ...conn,
      fromPort: optimalFromPort,
      toPort: optimalToPort,
    };
  });

  return {
    nodes: updatedNodes,
    connectors: updatedConnectors,
  };
}
