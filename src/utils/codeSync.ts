import { FlowNode, FlowConnector, ShapeType, ConnectorType, PortPosition } from '../types';

export interface ParseResult {
  success: boolean;
  nodes?: FlowNode[];
  connectors?: FlowConnector[];
  error?: string;
  errorLine?: number;
}

/**
 * Converts nodes and connectors to clean JSON string
 */
export function diagramToJSON(nodes: FlowNode[], connectors: FlowConnector[]): string {
  const exportData = {
    version: '2.0',
    generator: 'Flowchart Studio flow.io',
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      subLabel: n.subLabel || '',
      x: Math.round(n.x),
      y: Math.round(n.y),
      width: n.width,
      height: n.height,
      fillColor: n.fillColor,
      strokeColor: n.strokeColor,
      strokeWidth: n.strokeWidth,
      strokeStyle: n.strokeStyle,
      textColor: n.textColor,
      fontSize: n.fontSize,
      fontWeight: n.fontWeight,
      textAlign: n.textAlign,
      rounded: n.rounded,
      shadow: n.shadow,
    })),
    connectors: connectors.map((c) => ({
      id: c.id,
      from: c.fromNodeId,
      fromPort: c.fromPort,
      to: c.toNodeId,
      toPort: c.toPort,
      type: c.type,
      label: c.label || '',
      strokeColor: c.strokeColor,
      strokeWidth: c.strokeWidth,
      strokeStyle: c.strokeStyle,
      animated: c.animated,
      animationType: c.animationType || 'none',
      arrowEnd: c.arrowEnd,
      arrowEndType: c.arrowEndType || 'arrow',
      arrowStart: c.arrowStart,
      arrowStartType: c.arrowStartType || 'none',
      glow: c.glow || 'none',
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Parses JSON into FlowNode[] and FlowConnector[]
 */
export function jsonToDiagram(jsonStr: string): ParseResult {
  try {
    const data = JSON.parse(jsonStr);

    let rawNodes: any[] = [];
    let rawConnectors: any[] = [];

    if (Array.isArray(data)) {
      rawNodes = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.nodes)) rawNodes = data.nodes;
      if (Array.isArray(data.connectors)) rawConnectors = data.connectors;
    } else {
      return { success: false, error: 'Format JSON harus berupa objek dengan properti "nodes" dan "connectors".' };
    }

    if (rawNodes.length === 0) {
      return { success: false, error: 'Tidak ada simpul (nodes) yang terdefinisi dalam JSON.' };
    }

    const nodes: FlowNode[] = rawNodes.map((n, idx) => ({
      id: String(n.id || `node-${idx + 1}`),
      type: (n.type as ShapeType) || 'process',
      x: Number(n.x ?? 100 + (idx % 3) * 220),
      y: Number(n.y ?? 100 + Math.floor(idx / 3) * 160),
      width: Number(n.width || 180),
      height: Number(n.height || 68),
      label: String(n.label ?? `Node ${idx + 1}`),
      subLabel: n.subLabel ? String(n.subLabel) : undefined,
      fillColor: String(n.fillColor || '#1e293b'),
      strokeColor: String(n.strokeColor || '#38bdf8'),
      strokeWidth: Number(n.strokeWidth || 2),
      strokeStyle: n.strokeStyle || 'solid',
      textColor: String(n.textColor || '#f8fafc'),
      fontSize: Number(n.fontSize || 13),
      fontWeight: n.fontWeight || 'medium',
      textAlign: n.textAlign || 'center',
      rounded: Number(n.rounded ?? 8),
      shadow: n.shadow || 'none',
    }));

    const validNodeIds = new Set(nodes.map((n) => n.id));

    const connectors: FlowConnector[] = rawConnectors
      .filter((c) => {
        const fromId = c.from || c.fromNodeId;
        const toId = c.to || c.toNodeId;
        return fromId && toId && validNodeIds.has(fromId) && validNodeIds.has(toId);
      })
      .map((c, idx) => ({
        id: String(c.id || `conn-${idx + 1}`),
        fromNodeId: String(c.from || c.fromNodeId),
        fromPort: (c.fromPort as PortPosition) || 'bottom',
        toNodeId: String(c.to || c.toNodeId),
        toPort: (c.toPort as PortPosition) || 'top',
        type: (c.type as ConnectorType) || 'orthogonal',
        label: c.label ? String(c.label) : undefined,
        strokeColor: String(c.strokeColor || '#38bdf8'),
        strokeWidth: Number(c.strokeWidth || 2),
        strokeStyle: c.strokeStyle || 'solid',
        animated: Boolean(c.animated ?? true),
        animationType: c.animationType || 'marching-ants',
        arrowEnd: c.arrowEnd !== false,
        arrowEndType: c.arrowEndType || 'arrow',
        arrowStart: Boolean(c.arrowStart),
        arrowStartType: c.arrowStartType || 'none',
        glow: c.glow || 'cyan',
      }));

    return { success: true, nodes, connectors };
  } catch (err: any) {
    return {
      success: false,
      error: `JSON tidak valid: ${err.message || String(err)}`,
    };
  }
}

/**
 * Converts diagram into FlowScript DSL (clean human-readable syntax)
 */
export function diagramToDSL(nodes: FlowNode[], connectors: FlowConnector[]): string {
  const lines: string[] = [
    '// =========================================',
    '// Flowchart Studio (flow.io Script)',
    '// Format: <tipe>: <id> "<label>" [sub: "<subLabel>"] (x: <x>, y: <y>)',
    '// Garis:  <fromId> -> <toId> "<label>"',
    '// =========================================',
    '',
    '[NODES]',
  ];

  for (const n of nodes) {
    let nodeLine = `${n.type}: ${n.id} "${n.label.replace(/"/g, '\\"')}"`;
    if (n.subLabel) {
      nodeLine += ` [sub: "${n.subLabel.replace(/"/g, '\\"')}"]`;
    }
    nodeLine += ` (x: ${Math.round(n.x)}, y: ${Math.round(n.y)})`;
    lines.push(nodeLine);
  }

  lines.push('');
  lines.push('[CONNECTORS]');

  for (const c of connectors) {
    let connLine = `${c.fromNodeId} -> ${c.toNodeId}`;
    if (c.label) {
      connLine += ` "${c.label.replace(/"/g, '\\"')}"`;
    }
    if (c.type !== 'orthogonal') {
      connLine += ` [type: ${c.type}]`;
    }
    lines.push(connLine);
  }

  return lines.join('\n');
}

/**
 * Parses FlowScript DSL into nodes and connectors
 */
export function dslToDiagram(dslStr: string): ParseResult {
  // 1. Strip special LLM tokens like <|...|>, <||, </s>, <|im_end|>, etc.
  let cleanInput = dslStr
    .replace(/<\|[^>]*\|?>/g, '')
    .replace(/<\|+/g, '')
    .replace(/<\/s>/g, '')
    .trim();

  // 2. Extract code block if wrapped in markdown ```dsl ... ``` or ``` ... ```
  const codeBlockMatch = cleanInput.match(/```(?:dsl|flowscript|txt|markdown)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleanInput = codeBlockMatch[1].trim();
  }

  const lines = cleanInput.split('\n');
  const nodes: FlowNode[] = [];
  const connectors: FlowConnector[] = [];
  const nodeMap = new Map<string, FlowNode>();

  // Map common LLM shape type aliases to canonical ShapeType
  const normalizeShapeType = (raw: string): ShapeType => {
    const s = raw.toLowerCase().replace(/_/g, '-').trim();
    if (s === 'start' || s === 'end' || s === 'start-node' || s === 'end-node' || s === 'terminator' || s === 'start-end') {
      return 'terminator';
    }
    if (s === 'io' || s === 'input' || s === 'output' || s === 'input-output' || s === 'io-data') {
      return 'input-output';
    }
    if (s === 'decision' || s === 'condition' || s === 'cond' || s === 'branch' || s === 'if') {
      return 'decision';
    }
    if (s === 'database' || s === 'db' || s === 'storage' || s === 'sql' || s === 'repo') {
      return 'database';
    }
    if (s === 'document' || s === 'doc' || s === 'report') {
      return 'document';
    }
    if (s === 'multidocument' || s === 'multi-document' || s === 'docs') {
      return 'multidocument';
    }
    if (s === 'subprocess' || s === 'predefined-process' || s === 'subroutine' || s === 'sub-procedure') {
      return 'predefined-process';
    }
    if (s === 'manual-input' || s === 'user-input' || s === 'form-input') {
      return 'manual-input';
    }
    if (s === 'manual-operation' || s === 'manual') {
      return 'manual-operation';
    }
    if (s === 'prep' || s === 'preparation' || s === 'init') {
      return 'preparation';
    }
    if (s === 'delay' || s === 'wait' || s === 'timer') {
      return 'delay';
    }
    if (s === 'display' || s === 'ui' || s === 'screen' || s === 'view') {
      return 'display';
    }
    if (s === 'cloud' || s === 'api' || s === 'webhook' || s === 'service') {
      return 'cloud';
    }
    if (s === 'note' || s === 'comment' || s === 'annotation') {
      return 'note';
    }
    return 'process';
  };

  for (let i = 0; i < lines.length; i++) {
    let rawLine = lines[i].trim();

    // Ignore empty lines, comments, and markdown horizontal rules / fences
    if (
      !rawLine ||
      rawLine.startsWith('//') ||
      rawLine.startsWith('#') ||
      rawLine.startsWith(';') ||
      rawLine.startsWith('---') ||
      rawLine.startsWith('```')
    ) {
      continue;
    }

    // Strip inline comments (e.g. "start -> p1 // comment")
    const inlineCommentIdx = rawLine.indexOf('//');
    if (inlineCommentIdx > 0) {
      rawLine = rawLine.substring(0, inlineCommentIdx).trim();
    }

    // Section headers: [NODES], [CONNECTORS], [CONNECTIONS], [EDGES], etc.
    const upper = rawLine.toUpperCase().replace(/[#:[\]]/g, '').trim();
    if (upper === 'NODES' || upper === 'SIMPUL') {
      continue;
    }
    if (upper === 'CONNECTORS' || upper === 'CONNECTIONS' || upper === 'EDGES' || upper === 'LINKS' || upper === 'GARIS') {
      continue;
    }

    // 1. Try matching connector: e.g. "fromId -> toId "Label"", "fromId --> toId: 'Label'", "fromId -> toId [type: orthogonal]"
    if (rawLine.includes('->') || rawLine.includes('-->') || rawLine.includes('=>')) {
      const connMatch = rawLine.match(
        /^([a-zA-Z0-9_-]+)\s*(?:-+>|=+>)\s*([a-zA-Z0-9_-]+)(?::)?(?:\s+["']([^"']*)["'])?(?:\s+\[(.*)\])?/
      );
      if (connMatch) {
        const [, fromId, toId, label, optsStr] = connMatch;
        let type: ConnectorType = 'orthogonal';
        let customLabel = label;

        if (optsStr) {
          const typeMatch = optsStr.match(/type:\s*([a-zA-Z-]+)/i);
          if (typeMatch) {
            type = typeMatch[1] as ConnectorType;
          }
          const labelMatch = optsStr.match(/label:\s*["']([^"']*)["']/i);
          if (labelMatch) {
            customLabel = labelMatch[1];
          }
        }

        connectors.push({
          id: `conn-${connectors.length + 1}`,
          fromNodeId: fromId,
          fromPort: 'bottom',
          toNodeId: toId,
          toPort: 'top',
          type,
          label: customLabel || undefined,
          strokeColor: '#38bdf8',
          strokeWidth: 2,
          strokeStyle: 'solid',
          animated: true,
          animationType: 'marching-ants',
          arrowEnd: true,
          arrowEndType: 'arrow',
          arrowStart: false,
          glow: 'cyan',
        });
        continue;
      }
    }

    // 2. Try matching node definition:
    // e.g. "process: id "Label" [sub: "..."] (x: 100, y: 200)"
    // or with single quotes: "process: id 'Label'"
    // or optional coordinates / subLabels
    const nodeMatch = rawLine.match(
      /^([a-zA-Z0-9_-]+):\s*([a-zA-Z0-9_-]+)\s+["']([^"']*)["'](?:\s+\[sub:\s*["']([^"']*)["']\])?(?:\s+\(x:\s*(-?\d+(?:\.\d+)?),\s*y:\s*(-?\d+(?:\.\d+)?)\))?/
    );

    if (nodeMatch) {
      const [, typeStr, id, label, subLabel, xStr, yStr] = nodeMatch;
      const type = normalizeShapeType(typeStr);

      const hasCustomCoord = xStr !== undefined && yStr !== undefined;
      const defaultIdx = nodes.length;
      const x = hasCustomCoord ? Math.round(parseFloat(xStr)) : 260;
      const y = hasCustomCoord ? Math.round(parseFloat(yStr)) : 60 + defaultIdx * 130;

      // Color pallete based on type
      let fillColor = '#1e293b';
      let strokeColor = '#38bdf8';
      let rounded = 8;

      if (type === 'terminator' || type === 'start-end') {
        fillColor = '#0f2b1d';
        strokeColor = '#10b981';
        rounded = 29;
      } else if (type === 'decision') {
        fillColor = '#2b1e3a';
        strokeColor = '#f59e0b';
        rounded = 0;
      } else if (type === 'input-output') {
        fillColor = '#172554';
        strokeColor = '#60a5fa';
        rounded = 6;
      } else if (type === 'document' || type === 'multidocument') {
        fillColor = '#0f2d3a';
        strokeColor = '#2dd4bf';
        rounded = 6;
      } else if (type === 'predefined-process' || type === 'subprocess') {
        fillColor = '#231834';
        strokeColor = '#a855f7';
        rounded = 6;
      } else if (type === 'database') {
        fillColor = '#1a1f38';
        strokeColor = '#818cf8';
        rounded = 8;
      } else if (type === 'manual-input') {
        fillColor = '#1f2438';
        strokeColor = '#38bdf8';
        rounded = 6;
      } else if (type === 'manual-operation') {
        fillColor = '#261b2e';
        strokeColor = '#f472b6';
        rounded = 6;
      } else if (type === 'preparation') {
        fillColor = '#24211a';
        strokeColor = '#fbbf24';
        rounded = 0;
      } else if (type === 'delay') {
        fillColor = '#1e2330';
        strokeColor = '#94a3b8';
        rounded = 16;
      } else if (type === 'display') {
        fillColor = '#0f2730';
        strokeColor = '#38bdf8';
        rounded = 6;
      } else if (type === 'cloud') {
        fillColor = '#142036';
        strokeColor = '#38bdf8';
        rounded = 12;
      } else if (type === 'note') {
        fillColor = '#282414';
        strokeColor = '#facc15';
        rounded = 4;
      }

      const node: FlowNode = {
        id,
        type,
        x,
        y,
        width: type === 'connector' ? 64 : type === 'offpage-connector' ? 80 : type === 'decision' ? 190 : 180,
        height: type === 'connector' ? 64 : type === 'decision' ? 86 : 68,
        label,
        subLabel: subLabel || undefined,
        fillColor,
        strokeColor,
        strokeWidth: 2,
        strokeStyle: 'solid',
        textColor: '#f8fafc',
        fontSize: 13,
        fontWeight: 'medium',
        textAlign: 'center',
        rounded,
        shadow: 'none',
      };

      nodes.push(node);
      nodeMap.set(id, node);
      continue;
    }

    // 3. Graceful handling of non-syntax lines:
    // If the line is an explanation, conversational prose, notes, or markdown from LLM
    // (e.g. "This updated FlowScript DSL code represents...", "Catatan alur...", "Penjelasan: ...")
    // If we already parsed at least 1 node OR if the line looks like conversational text, skip it!
    const isConversationalProse =
      nodes.length > 0 ||
      /^(this|here|note|catatan|penjelasan|the|in|workflow|alur|berikut|semua|final|selesai)\b/i.test(rawLine) ||
      !rawLine.includes(':');

    if (isConversationalProse) {
      // Safely treat as prose commentary and continue
      continue;
    }

    // If no nodes parsed yet and line is truly malformed, return descriptive error
    return {
      success: false,
      error: `Baris ${i + 1} tidak dikenali: "${rawLine}"`,
      errorLine: i + 1,
    };
  }

  if (nodes.length === 0) {
    return {
      success: false,
      error: 'Tidak ditemukan definisi simpul (nodes). Contoh: process: p1 "Langkah Kerja"',
    };
  }

  // Filter connectors to valid node ids
  const validConnectors = connectors.filter(
    (c) => nodeMap.has(c.fromNodeId) && nodeMap.has(c.toNodeId)
  );

  // If nodes don't have explicit custom coordinates, calculate intelligent layout
  const hasExplicitPositions = lines.some((l) => /\(x:\s*-?\d+,\s*y:\s*-?\d+\)/.test(l));
  if (!hasExplicitPositions) {
    autoLayoutNodes(nodes, validConnectors);
  }

  return { success: true, nodes, connectors: validConnectors };
}

/**
 * Intelligent Top-to-Bottom Auto Layout for generated nodes
 */
function autoLayoutNodes(nodes: FlowNode[], connectors: FlowConnector[]) {
  const outgoingMap = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();

  for (const n of nodes) {
    outgoingMap.set(n.id, []);
    incomingCount.set(n.id, 0);
  }

  for (const c of connectors) {
    outgoingMap.get(c.fromNodeId)?.push(c.toNodeId);
    incomingCount.set(c.toNodeId, (incomingCount.get(c.toNodeId) || 0) + 1);
  }

  // Find root nodes (no incoming connectors or terminator start)
  const roots = nodes.filter((n) => (incomingCount.get(n.id) || 0) === 0 || n.type === 'terminator');
  const startRoots = roots.length > 0 ? roots : [nodes[0]];

  const visited = new Set<string>();
  const levels = new Map<string, number>();

  function assignLevel(nodeId: string, level: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    levels.set(nodeId, Math.max(levels.get(nodeId) || 0, level));

    const children = outgoingMap.get(nodeId) || [];
    children.forEach((childId) => {
      assignLevel(childId, level + 1);
    });
  }

  startRoots.forEach((r) => assignLevel(r.id, 0));

  // Assign any remaining unvisited nodes
  nodes.forEach((n, idx) => {
    if (!levels.has(n.id)) {
      levels.set(n.id, idx);
    }
  });

  // Group by level
  const levelGroups = new Map<number, FlowNode[]>();
  nodes.forEach((n) => {
    const lvl = levels.get(n.id) || 0;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
    levelGroups.get(lvl)!.push(n);
  });

  // Calculate coordinates
  const startY = 60;
  const levelHeight = 130;
  const centerX = 340;

  levelGroups.forEach((groupNodes, lvl) => {
    const count = groupNodes.length;
    const spacingX = 230;
    const startX = centerX - ((count - 1) * spacingX) / 2;

    groupNodes.forEach((n, colIdx) => {
      n.x = Math.round(startX + colIdx * spacingX);
      n.y = Math.round(startY + lvl * levelHeight);
    });
  });
}

