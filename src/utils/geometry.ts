import { FlowNode, PortPosition, ConnectorType } from '../types';

export interface Point {
  x: number;
  y: number;
}

/**
 * Calculates absolute coordinates of a port on a node
 */
export function getPortPosition(node: FlowNode, port: PortPosition): Point {
  const { x, y, width, height } = node;

  switch (port) {
    case 'top':
      return { x: x + width / 2, y };
    case 'right':
      return { x: x + width, y: y + height / 2 };
    case 'bottom':
      return { x: x + width / 2, y: y + height };
    case 'left':
      return { x, y: y + height / 2 };
  }
}

/**
 * Calculates smooth cubic bezier path between two ports
 */
export function getCurvedPath(
  start: Point,
  end: Point,
  fromPort: PortPosition,
  toPort: PortPosition,
  curvature: number = 0.35
): { path: string; mid: Point } {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const offset = Math.max(30, Math.min(180, (dx + dy) * curvature));

  let cp1 = { ...start };
  let cp2 = { ...end };

  switch (fromPort) {
    case 'top':
      cp1.y -= offset;
      break;
    case 'bottom':
      cp1.y += offset;
      break;
    case 'left':
      cp1.x -= offset;
      break;
    case 'right':
      cp1.x += offset;
      break;
  }

  switch (toPort) {
    case 'top':
      cp2.y -= offset;
      break;
    case 'bottom':
      cp2.y += offset;
      break;
    case 'left':
      cp2.x -= offset;
      break;
    case 'right':
      cp2.x += offset;
      break;
  }

  const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
  
  // Midpoint of cubic bezier at t = 0.5
  const t = 0.5;
  const mt = 1 - t;
  const midX = mt * mt * mt * start.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * end.x;
  const midY = mt * mt * mt * start.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * end.y;

  return { path, mid: { x: midX, y: midY } };
}

/**
 * Helper to compute clean orthogonal waypoints between two ports
 */
export function getOrthogonalWaypoints(
  start: Point,
  end: Point,
  fromPort: PortPosition,
  toPort: PortPosition
): Point[] {
  // Direct straight line check (if ports are facing each other in alignment)
  const isDirectStraightV =
    Math.abs(start.x - end.x) < 3 &&
    ((fromPort === 'bottom' && toPort === 'top' && end.y >= start.y) ||
     (fromPort === 'top' && toPort === 'bottom' && start.y >= end.y));

  const isDirectStraightH =
    Math.abs(start.y - end.y) < 3 &&
    ((fromPort === 'right' && toPort === 'left' && end.x >= start.x) ||
     (fromPort === 'left' && toPort === 'right' && start.x >= end.x));

  if (isDirectStraightV || isDirectStraightH) {
    return [start, end];
  }

  const margin = 24;

  // Step 1: Initial exit vector from start port
  let pStartExit = { ...start };
  switch (fromPort) {
    case 'top': pStartExit.y -= margin; break;
    case 'bottom': pStartExit.y += margin; break;
    case 'left': pStartExit.x -= margin; break;
    case 'right': pStartExit.x += margin; break;
  }

  // Step 2: Entry approach vector to end port
  let pEndApproach = { ...end };
  switch (toPort) {
    case 'top': pEndApproach.y -= margin; break;
    case 'bottom': pEndApproach.y += margin; break;
    case 'left': pEndApproach.x -= margin; break;
    case 'right': pEndApproach.x += margin; break;
  }

  const rawPoints: Point[] = [start, pStartExit];

  const isHFrom = fromPort === 'left' || fromPort === 'right';
  const isHTo = toPort === 'left' || toPort === 'right';

  if (isHFrom && isHTo) {
    // Both ports are horizontal
    if ((fromPort === 'right' && toPort === 'left' && pStartExit.x <= pEndApproach.x) ||
        (fromPort === 'left' && toPort === 'right' && pStartExit.x >= pEndApproach.x)) {
      // Natural opposing ports with forward gap
      const midX = (pStartExit.x + pEndApproach.x) / 2;
      rawPoints.push({ x: midX, y: pStartExit.y });
      rawPoints.push({ x: midX, y: pEndApproach.y });
    } else if (fromPort === toPort) {
      // Both exiting same direction (e.g. both right or both left)
      const outerX = fromPort === 'right'
        ? Math.max(pStartExit.x, pEndApproach.x) + 12
        : Math.min(pStartExit.x, pEndApproach.x) - 12;
      rawPoints.push({ x: outerX, y: pStartExit.y });
      rawPoints.push({ x: outerX, y: pEndApproach.y });
    } else {
      // Loopback around
      const midY = (pStartExit.y + pEndApproach.y) / 2;
      rawPoints.push({ x: pStartExit.x, y: midY });
      rawPoints.push({ x: pEndApproach.x, y: midY });
    }
  } else if (!isHFrom && !isHTo) {
    // Both ports are vertical
    if ((fromPort === 'bottom' && toPort === 'top' && pStartExit.y <= pEndApproach.y) ||
        (fromPort === 'top' && toPort === 'bottom' && pStartExit.y >= pEndApproach.y)) {
      // Natural vertical flow
      const midY = (pStartExit.y + pEndApproach.y) / 2;
      rawPoints.push({ x: pStartExit.x, y: midY });
      rawPoints.push({ x: pEndApproach.x, y: midY });
    } else if (fromPort === toPort) {
      // Both exiting same vertical direction (e.g. both bottom or both top)
      const outerY = fromPort === 'bottom'
        ? Math.max(pStartExit.y, pEndApproach.y) + 12
        : Math.min(pStartExit.y, pEndApproach.y) - 12;
      rawPoints.push({ x: pStartExit.x, y: outerY });
      rawPoints.push({ x: pEndApproach.x, y: outerY });
    } else {
      // Loopback around
      const midX = (pStartExit.x + pEndApproach.x) / 2;
      rawPoints.push({ x: midX, y: pStartExit.y });
      rawPoints.push({ x: midX, y: pEndApproach.y });
    }
  } else if (isHFrom && !isHTo) {
    // Horizontal exit, Vertical entry (e.g. Right to Top, Left to Bottom)
    rawPoints.push({ x: pEndApproach.x, y: pStartExit.y });
  } else {
    // Vertical exit, Horizontal entry (e.g. Bottom to Right, Top to Left)
    rawPoints.push({ x: pStartExit.x, y: pEndApproach.y });
  }

  rawPoints.push(pEndApproach);
  rawPoints.push(end);

  // Clean redundant / collinear waypoints
  const simplified: Point[] = [];
  for (let i = 0; i < rawPoints.length; i++) {
    const pt = rawPoints[i];
    if (simplified.length > 0) {
      const prev = simplified[simplified.length - 1];
      // Skip duplicate points within 0.5px
      if (Math.hypot(pt.x - prev.x, pt.y - prev.y) < 0.5) {
        continue;
      }
    }
    simplified.push(pt);
  }

  // Remove middle point of 3 collinear points
  const finalPoints: Point[] = [];
  for (let i = 0; i < simplified.length; i++) {
    if (i > 0 && i < simplified.length - 1) {
      const prev = simplified[i - 1];
      const curr = simplified[i];
      const next = simplified[i + 1];

      const isCollinearX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
      const isCollinearY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
      if (isCollinearX || isCollinearY) {
        continue;
      }
    }
    finalPoints.push(simplified[i]);
  }

  return finalPoints;
}

/**
 * Calculates orthogonal (step / 90 degree) path between two ports
 */
export function getOrthogonalPath(
  start: Point,
  end: Point,
  fromPort: PortPosition,
  toPort: PortPosition
): { path: string; mid: Point } {
  const points = getOrthogonalWaypoints(start, end, fromPort, toPort);

  let pathStr = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathStr += ` L ${points[i].x} ${points[i].y}`;
  }

  // Find middle along the total path length
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    totalLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }

  let traversed = 0;
  let midPoint: Point = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  const halfLen = totalLen / 2;
  for (let i = 1; i < points.length; i++) {
    const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (traversed + segLen >= halfLen) {
      const ratio = segLen > 0 ? (halfLen - traversed) / segLen : 0.5;
      midPoint = {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * ratio,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * ratio,
      };
      break;
    }
    traversed += segLen;
  }

  return { path: pathStr, mid: midPoint };
}

/**
 * Calculates straight line path
 */
export function getStraightPath(start: Point, end: Point): { path: string; mid: Point } {
  return {
    path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    mid: {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    },
  };
}

/**
 * Calculates smooth rounded-corner orthogonal path (Smooth Step)
 */
export function getSmoothStepPath(
  start: Point,
  end: Point,
  fromPort: PortPosition,
  toPort: PortPosition,
  borderRadius: number = 14
): { path: string; mid: Point } {
  const points = getOrthogonalWaypoints(start, end, fromPort, toPort);

  if (points.length <= 2) {
    return {
      path: `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`,
      mid: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
    };
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);

    if (len1 < 1 || len2 < 1) {
      continue;
    }

    const r = Math.min(borderRadius, len1 / 2, len2 / 2);
    const startCurve = {
      x: curr.x + (v1.x / len1) * r,
      y: curr.y + (v1.y / len1) * r,
    };
    const endCurve = {
      x: curr.x + (v2.x / len2) * r,
      y: curr.y + (v2.y / len2) * r,
    };

    d += ` L ${startCurve.x} ${startCurve.y} Q ${curr.x} ${curr.y} ${endCurve.x} ${endCurve.y}`;
  }

  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;

  // Find midpoint
  const ortho = getOrthogonalPath(start, end, fromPort, toPort);
  return { path: d, mid: ortho.mid };
}

/**
 * Returns path data based on connector type
 */
export function getConnectorPath(
  start: Point,
  end: Point,
  fromPort: PortPosition,
  toPort: PortPosition,
  type: ConnectorType,
  curvature?: number
): { path: string; mid: Point } {
  switch (type) {
    case 'curved':
      return getCurvedPath(start, end, fromPort, toPort, curvature);
    case 'smooth-step':
      return getSmoothStepPath(start, end, fromPort, toPort);
    case 'orthogonal':
      return getOrthogonalPath(start, end, fromPort, toPort);
    case 'straight':
      return getStraightPath(start, end);
  }
}

/**
 * Snap coordinate to grid
 */
export function snapToGrid(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 1) return value;
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Calculate bounding box around all nodes
 */
export function getDiagramBounds(nodes: FlowNode[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x + node.width > maxX) maxX = node.x + node.width;
    if (node.y + node.height > maxY) maxY = node.y + node.height;
  }

  // Add margin around nodes
  const margin = 60;
  minX -= margin;
  minY -= margin;
  maxX += margin;
  maxY += margin;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(200, maxX - minX),
    height: Math.max(200, maxY - minY),
  };
}
