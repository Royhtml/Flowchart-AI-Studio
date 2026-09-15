import { FlowNode, FlowConnector } from '../types';
import { getPortPosition, getConnectorPath, getDiagramBounds } from './geometry';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportOptions {
  fileName?: string;
  transparentBg?: boolean;
  scale?: number; // 1, 2, or 3 for HD
  includeWatermark?: boolean;
  format?: 'png' | 'jpg' | 'jpeg' | 'pdf' | 'svg';
  quality?: number; // 0-1 for JPG quality
}

/**
 * Render diagram elements cleanly onto an HTML5 Canvas context
 */
export function renderDiagramToCanvas(
  canvas: HTMLCanvasElement,
  nodes: FlowNode[],
  connectors: FlowConnector[],
  options: {
    transparentBg?: boolean;
    scale?: number;
    padding?: number;
    showGrid?: boolean;
    minWidth?: number;
    minHeight?: number;
  } = {}
): { width: number; height: number; exportWidth: number; exportHeight: number } {
  const {
    transparentBg = false,
    scale = 2,
    padding = 60,
    showGrid = true,
    minWidth = 300,
    minHeight = 200,
  } = options;

  const bounds = getDiagramBounds(nodes.length > 0 ? nodes : [{
    id: 'placeholder',
    type: 'process',
    x: 0,
    y: 0,
    width: 200,
    height: 80,
    label: 'Empty Canvas',
    fillColor: '#1e293b',
    strokeColor: '#475569',
    strokeWidth: 2,
    strokeStyle: 'solid',
    textColor: '#94a3b8',
    fontSize: 14,
    fontWeight: 'medium',
    textAlign: 'center',
    rounded: 8,
    shadow: 'none'
  }]);

  const rawWidth = Math.max(minWidth, bounds.width + padding * 2);
  const rawHeight = Math.max(minHeight, bounds.height + padding * 2);

  canvas.width = Math.round(rawWidth * scale);
  canvas.height = Math.round(rawHeight * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: canvas.width, height: canvas.height, exportWidth: rawWidth, exportHeight: rawHeight };

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(scale, scale);

  // Background
  if (!transparentBg) {
    ctx.fillStyle = '#090d16'; // Deep dark canvas color
    ctx.fillRect(0, 0, rawWidth, rawHeight);

    if (showGrid) {
      // Draw subtle grid dots
      ctx.fillStyle = '#1e293b';
      const dotSpacing = 24;
      for (let x = 0; x < rawWidth; x += dotSpacing) {
        for (let y = 0; y < rawHeight; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Translation to center bounding box
  const offsetX = -bounds.minX + padding;
  const offsetY = -bounds.minY + padding;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // 1. Draw Connectors
  for (const conn of connectors) {
    const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
    const toNode = nodes.find((n) => n.id === conn.toNodeId);
    if (!fromNode || !toNode) continue;

    const start = getPortPosition(fromNode, conn.fromPort);
    const end = getPortPosition(toNode, conn.toPort);
    const { path, mid } = getConnectorPath(start, end, conn.fromPort, conn.toPort, conn.type);

    ctx.save();
    ctx.strokeStyle = conn.strokeColor || '#38bdf8';
    ctx.lineWidth = conn.strokeWidth || 2;
    if (conn.strokeStyle === 'dashed') {
      ctx.setLineDash([6, 4]);
    } else if (conn.strokeStyle === 'dotted') {
      ctx.setLineDash([2, 3]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Parse SVG Path string to Canvas Path2D
    const p2d = new Path2D(path);
    ctx.stroke(p2d);

    // Draw arrow at end
    if (conn.arrowEnd) {
      drawArrowHead(ctx, end, conn.toPort, conn.strokeColor || '#38bdf8');
    }

    // Draw Connector Label if exists
    if (conn.label) {
      ctx.font = '600 11px system-ui, sans-serif';
      const textMetrics = ctx.measureText(conn.label);
      const textW = textMetrics.width;
      const pad = 6;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mid.x - textW / 2 - pad, mid.y - 10, textW + pad * 2, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(conn.label, mid.x, mid.y);
    }

    ctx.restore();
  }

  // 2. Draw Nodes
  for (const node of nodes) {
    ctx.save();

    // Node shape
    drawNodeShape(ctx, node);

    // Node Text
    ctx.fillStyle = node.textColor || '#f8fafc';
    ctx.textAlign = (node.textAlign as CanvasTextAlign) || 'center';
    ctx.textBaseline = 'middle';

    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;

    if (node.subLabel) {
      ctx.font = `${node.fontWeight === 'bold' ? 'bold' : '600'} ${node.fontSize || 13}px system-ui, sans-serif`;
      ctx.fillText(node.label, cx, cy - 8);

      ctx.font = '400 11px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(node.subLabel, cx, cy + 10);
    } else {
      ctx.font = `${node.fontWeight === 'bold' ? 'bold' : '500'} ${node.fontSize || 13}px system-ui, sans-serif`;
      ctx.fillText(node.label, cx, cy);
    }

    ctx.restore();
  }

  ctx.restore();
  ctx.restore();

  return { width: canvas.width, height: canvas.height, exportWidth: rawWidth, exportHeight: rawHeight };
}

/**
 * High-definition PNG Exporter using Native HTML5 Canvas
 */
export async function exportFlowchartToPNG(
  nodes: FlowNode[],
  connectors: FlowConnector[],
  options: ExportOptions = {}
): Promise<void> {
  const format = options.format || 'png';
  
  if (nodes.length === 0) {
    alert('There are no elements on the canvas to export!');
    return;
  }

  const {
    fileName = `flowchart-${Date.now()}.${format}`,
    transparentBg = false,
    scale = 2, // 2x for ultra crisp rendering
    quality = 0.95, // JPG quality
  } = options;

  const canvas = document.createElement('canvas');
  renderDiagramToCanvas(canvas, nodes, connectors, {
    transparentBg,
    scale,
    padding: 60,
  });

  // Export based on format
  if (format === 'jpg' || format === 'jpeg') {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    downloadDataUrl(dataUrl, fileName);
  } else {
    const dataUrl = canvas.toDataURL('image/png');
    downloadDataUrl(dataUrl, fileName);
  }
}

/**
 * Copy Flowchart Image to Clipboard
 */
export async function copyFlowchartToClipboard(
  nodes: FlowNode[],
  connectors: FlowConnector[],
  options: ExportOptions = {}
): Promise<boolean> {
  if (nodes.length === 0) return false;

  const canvas = document.createElement('canvas');
  renderDiagramToCanvas(canvas, nodes, connectors, {
    transparentBg: options.transparentBg ?? false,
    scale: options.scale ?? 2,
    padding: 60,
  });

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        resolve(true);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
        resolve(false);
      }
    }, 'image/png');
  });
}

/**
 * Export to PDF using jsPDF
 */
export async function exportFlowchartToPDF(
  nodes: FlowNode[],
  connectors: FlowConnector[],
  options: ExportOptions = {}
): Promise<void> {
  if (nodes.length === 0) {
    alert('There are no elements on the canvas to export!');
    return;
  }

  const {
    fileName = `flowchart-${Date.now()}.pdf`,
    transparentBg = false,
    scale = 2,
  } = options;

  const bounds = getDiagramBounds(nodes);
  const padding = 60;
  const exportWidth = bounds.width + padding * 2;
  const exportHeight = bounds.height + padding * 2;

  // Create canvas first
  const canvas = document.createElement('canvas');
  canvas.width = exportWidth * scale;
  canvas.height = exportHeight * scale;
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  ctx.scale(scale, scale);

  // Background
  if (!transparentBg) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    ctx.fillStyle = '#1e293b';
    const dotSpacing = 24;
    for (let x = 0; x < exportWidth; x += dotSpacing) {
      for (let y = 0; y < exportHeight; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const offsetX = -bounds.minX + padding;
  const offsetY = -bounds.minY + padding;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Draw Connectors
  for (const conn of connectors) {
    const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
    const toNode = nodes.find((n) => n.id === conn.toNodeId);
    if (!fromNode || !toNode) continue;

    const start = getPortPosition(fromNode, conn.fromPort);
    const end = getPortPosition(toNode, conn.toPort);
    const { path, mid } = getConnectorPath(start, end, conn.fromPort, conn.toPort, conn.type);

    ctx.save();
    ctx.strokeStyle = conn.strokeColor || '#64748b';
    ctx.lineWidth = conn.strokeWidth || 2;
    if (conn.strokeStyle === 'dashed') {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const p2d = new Path2D(path);
    ctx.stroke(p2d);

    if (conn.arrowEnd) {
      drawArrowHead(ctx, end, conn.toPort, conn.strokeColor || '#64748b');
    }

    if (conn.label) {
      ctx.font = '600 11px system-ui, sans-serif';
      const textMetrics = ctx.measureText(conn.label);
      const textW = textMetrics.width;
      const pad = 6;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mid.x - textW / 2 - pad, mid.y - 10, textW + pad * 2, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(conn.label, mid.x, mid.y);
    }

    ctx.restore();
  }

  // Draw Nodes
  for (const node of nodes) {
    ctx.save();
    drawNodeShape(ctx, node);

    ctx.fillStyle = node.textColor || '#f8fafc';
    ctx.textAlign = (node.textAlign as CanvasTextAlign) || 'center';
    ctx.textBaseline = 'middle';

    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;

    if (node.subLabel) {
      ctx.font = `${node.fontWeight === 'bold' ? 'bold' : '600'} ${node.fontSize || 13}px system-ui, sans-serif`;
      ctx.fillText(node.label, cx, cy - 8);

      ctx.font = '400 11px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(node.subLabel, cx, cy + 10);
    } else {
      ctx.font = `${node.fontWeight === 'bold' ? 'bold' : '500'} ${node.fontSize || 13}px system-ui, sans-serif`;
      ctx.fillText(node.label, cx, cy);
    }

    ctx.restore();
  }

  ctx.restore();

  // Convert canvas to image
  const imgData = canvas.toDataURL('image/png');

  // Create PDF
  const pdf = new jsPDF({
    orientation: exportWidth > exportHeight ? 'landscape' : 'portrait',
    unit: 'px',
    format: [exportWidth, exportHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, exportWidth, exportHeight);
  pdf.save(fileName);
}

/**
 * Export to SVG format
 */
export async function exportFlowchartToSVG(
  nodes: FlowNode[],
  connectors: FlowConnector[],
  options: ExportOptions = {}
): Promise<void> {
  if (nodes.length === 0) {
    alert('There are no elements on the canvas to export!');
    return;
  }

  const {
    fileName = `flowchart-${Date.now()}.svg`,
    transparentBg = false,
  } = options;

  const bounds = getDiagramBounds(nodes);
  const padding = 60;
  const exportWidth = bounds.width + padding * 2;
  const exportHeight = bounds.height + padding * 2;

  const offsetX = -bounds.minX + padding;
  const offsetY = -bounds.minY + padding;

  // Build SVG string
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">`;

  // Background
  if (!transparentBg) {
    svgContent += `<rect width="${exportWidth}" height="${exportHeight}" fill="#090d16"/>`;
    
    // Grid dots
    const dotSpacing = 24;
    for (let x = 0; x < exportWidth; x += dotSpacing) {
      for (let y = 0; y < exportHeight; y += dotSpacing) {
        svgContent += `<circle cx="${x}" cy="${y}" r="1" fill="#1e293b"/>`;
      }
    }
  }

  // Group with offset
  svgContent += `<g transform="translate(${offsetX}, ${offsetY})">`;

  // Draw Connectors
  for (const conn of connectors) {
    const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
    const toNode = nodes.find((n) => n.id === conn.toNodeId);
    if (!fromNode || !toNode) continue;

    const start = getPortPosition(fromNode, conn.fromPort);
    const end = getPortPosition(toNode, conn.toPort);
    const { path, mid } = getConnectorPath(start, end, conn.fromPort, conn.toPort, conn.type);

    const strokeDasharray = conn.strokeStyle === 'dashed' ? '6,4' : conn.strokeStyle === 'dotted' ? '2,3' : 'none';
    
    svgContent += `<path d="${path}" stroke="${conn.strokeColor || '#64748b'}" stroke-width="${conn.strokeWidth || 2}" stroke-dasharray="${strokeDasharray}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

    // Arrow
    if (conn.arrowEnd) {
      const arrowSVG = getArrowHeadSVG(end, conn.toPort, conn.strokeColor || '#64748b');
      svgContent += arrowSVG;
    }

    // Label
    if (conn.label) {
      svgContent += `<text x="${mid.x}" y="${mid.y}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="600" fill="#e2e8f0">${conn.label}</text>`;
    }
  }

  // Draw Nodes
  for (const node of nodes) {
    const shapeSVG = getNodeShapeSVG(node);
    svgContent += shapeSVG;

    // Text
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;

    if (node.subLabel) {
      svgContent += `<text x="${cx}" y="${cy - 8}" text-anchor="center" dominant-baseline="middle" font-size="${node.fontSize || 13}" font-weight="${node.fontWeight === 'bold' ? 'bold' : '600'}" fill="${node.textColor || '#f8fafc'}">${escapeXml(node.label)}</text>`;
      svgContent += `<text x="${cx}" y="${cy + 10}" text-anchor="center" dominant-baseline="middle" font-size="11" fill="#94a3b8">${escapeXml(node.subLabel)}</text>`;
    } else {
      svgContent += `<text x="${cx}" y="${cy}" text-anchor="center" dominant-baseline="middle" font-size="${node.fontSize || 13}" font-weight="${node.fontWeight === 'bold' ? 'bold' : '500'}" fill="${node.textColor || '#f8fafc'}">${escapeXml(node.label)}</text>`;
    }
  }

  svgContent += `</g></svg>`;

  // Download SVG
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper: Download data URL
 */
function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper: Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Helper: Get SVG path for arrow head
 */
function getArrowHeadSVG(point: { x: number; y: number }, port: string, color: string): string {
  const size = 7;
  let angle = 0;
  switch (port) {
    case 'top': angle = Math.PI / 2; break;
    case 'bottom': angle = -Math.PI / 2; break;
    case 'left': angle = 0; break;
    case 'right': angle = Math.PI; break;
  }

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const x1 = point.x - cos * size * 1.5 + sin * size;
  const y1 = point.y - sin * size * 1.5 - cos * size;
  const x2 = point.x - cos * size * 1.5 - sin * size;
  const y2 = point.y - sin * size * 1.5 + cos * size;

  return `<polygon points="${point.x},${point.y} ${x1},${y1} ${x2},${y2}" fill="${color}"/>`;
}

/**
 * Helper: Get SVG path for node shape
 */
function getNodeShapeSVG(node: FlowNode): string {
  const { x, y, width, height, type, fillColor, strokeColor, strokeWidth, strokeStyle } = node;
  const strokeDasharray = strokeStyle === 'dashed' ? '5,4' : strokeStyle === 'dotted' ? '2,3' : 'none';

  let pathD = '';
  
  switch (type) {
    case 'start-end': {
      const r = height / 2;
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${r}" ry="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}"/>`;
    }
    case 'decision': {
      pathD = `M ${x + width / 2},${y} L ${x + width},${y + height / 2} L ${x + width / 2},${y + height} L ${x},${y + height / 2} Z`;
      break;
    }
    case 'input-output': {
      const slant = 18;
      pathD = `M ${x + slant},${y} L ${x + width},${y} L ${x + width - slant},${y + height} L ${x},${y + height} Z`;
      break;
    }
    case 'database': {
      const rh = 12;
      return `<ellipse cx="${x + width / 2}" cy="${y + rh}" rx="${width / 2}" ry="${rh}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/><path d="M ${x},${y + rh} L ${x},${y + height - rh} A ${width / 2} ${rh} 0 0 0 ${x + width} ${y + height - rh} L ${x + width},${y + rh}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}"/>`;
    }
    case 'process':
    default: {
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${node.rounded || 8}" ry="${node.rounded || 8}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}"/>`;
    }
  }

  return `<path d="${pathD}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}"/>`;
}

function drawArrowHead(ctx: CanvasRenderingContext2D, point: { x: number; y: number }, port: string, color: string) {
  const size = 7;
  let angle = 0;
  switch (port) {
    case 'top':
      angle = Math.PI / 2;
      break;
    case 'bottom':
      angle = -Math.PI / 2;
      break;
    case 'left':
      angle = 0;
      break;
    case 'right':
      angle = Math.PI;
      break;
  }

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size * 1.5, -size);
  ctx.lineTo(-size * 1.5, size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawNodeShape(ctx: CanvasRenderingContext2D, node: FlowNode) {
  const { x, y, width, height, type, fillColor, strokeColor, strokeWidth, strokeStyle } = node;

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;

  if (strokeStyle === 'dashed') {
    ctx.setLineDash([5, 4]);
  } else if (strokeStyle === 'dotted') {
    ctx.setLineDash([2, 3]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.beginPath();

  switch (type) {
    case 'start-end':
    case 'terminator': {
      const radius = height / 2;
      ctx.roundRect(x, y, width, height, radius);
      break;
    }
    case 'decision': {
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height / 2);
      ctx.lineTo(x + width / 2, y + height);
      ctx.lineTo(x, y + height / 2);
      ctx.closePath();
      break;
    }
    case 'input-output': {
      const slant = 18;
      ctx.moveTo(x + slant, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width - slant, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      break;
    }
    case 'cylinder':
    case 'database': {
      const rh = 12;
      ctx.ellipse(x + width / 2, y + rh, width / 2, rh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.rect(x, y + rh, width, height - rh * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y + rh);
      ctx.lineTo(x, y + height - rh);
      ctx.ellipse(x + width / 2, y + height - rh, width / 2, rh, 0, 0, Math.PI, false);
      ctx.lineTo(x + width, y + rh);
      break;
    }
    case 'multidocument': {
      // Secondary background sheet
      ctx.roundRect(x + 6, y - 6, width - 6, height - 6, 4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      const wave = 10;
      ctx.moveTo(x, y);
      ctx.lineTo(x + width - 6, y);
      ctx.lineTo(x + width - 6, y + height - wave);
      ctx.bezierCurveTo(
        x + (width - 6) * 0.75,
        y + height,
        x + (width - 6) * 0.25,
        y + height - wave * 2,
        x,
        y + height - wave
      );
      ctx.closePath();
      break;
    }
    case 'document': {
      const wave = 10;
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + height - wave);
      ctx.bezierCurveTo(
        x + width * 0.75,
        y + height,
        x + width * 0.25,
        y + height - wave * 2,
        x,
        y + height - wave
      );
      ctx.closePath();
      break;
    }
    case 'subprocess':
    case 'predefined-process': {
      ctx.roundRect(x, y, width, height, node.rounded || 6);
      ctx.fill();
      ctx.stroke();

      // Inner vertical stripes
      const stripeOffset = 14;
      ctx.beginPath();
      ctx.moveTo(x + stripeOffset, y);
      ctx.lineTo(x + stripeOffset, y + height);
      ctx.moveTo(x + width - stripeOffset, y);
      ctx.lineTo(x + width - stripeOffset, y + height);
      ctx.stroke();
      return;
    }
    case 'hexagon':
    case 'preparation': {
      const hx = width / 6;
      ctx.moveTo(x + hx, y);
      ctx.lineTo(x + width - hx, y);
      ctx.lineTo(x + width, y + height / 2);
      ctx.lineTo(x + width - hx, y + height);
      ctx.lineTo(x + hx, y + height);
      ctx.lineTo(x, y + height / 2);
      ctx.closePath();
      break;
    }
    case 'triangle': {
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      break;
    }
    case 'star': {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const spikes = 5;
      const outerR = Math.min(width, height) / 2;
      const innerR = outerR / 2.2;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      ctx.moveTo(cx, cy - outerR);
      for (let i = 0; i < spikes; i++) {
        let sx = cx + Math.cos(rot) * outerR;
        let sy = cy + Math.sin(rot) * outerR;
        ctx.lineTo(sx, sy);
        rot += step;
        sx = cx + Math.cos(rot) * innerR;
        sy = cy + Math.sin(rot) * innerR;
        ctx.lineTo(sx, sy);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerR);
      ctx.closePath();
      break;
    }
    case 'shield': {
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + height * 0.6);
      ctx.quadraticCurveTo(x + width / 2, y + height * 1.1, x + width / 2, y + height);
      ctx.quadraticCurveTo(x + width / 2, y + height * 1.1, x, y + height * 0.6);
      ctx.closePath();
      break;
    }
    case 'cloud':
    case 'cloud-service': {
      ctx.roundRect(x, y, width, height, 18);
      break;
    }
    case 'delay': {
      const r = height / 2;
      ctx.moveTo(x, y);
      ctx.lineTo(x + width - r, y);
      ctx.arc(x + width - r, y + r, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      break;
    }
    case 'manual-input': {
      const slant = 14;
      ctx.moveTo(x, y + slant);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      break;
    }
    case 'note': {
      const fold = 14;
      ctx.moveTo(x, y);
      ctx.lineTo(x + width - fold, y);
      ctx.lineTo(x + width, y + fold);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      break;
    }
    case 'callout': {
      const pSize = 14;
      ctx.roundRect(x, y, width, height - pSize, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 20, y + height - pSize);
      ctx.lineTo(x + 10, y + height);
      ctx.lineTo(x + 36, y + height - pSize);
      ctx.closePath();
      break;
    }
    case 'badge': {
      const indent = 12;
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width - indent, y + height / 2);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + indent, y + height / 2);
      ctx.closePath();
      break;
    }
    case 'process':
    default: {
      ctx.roundRect(x, y, width, height, node.rounded || 8);
      break;
    }
  }

  ctx.fill();
  ctx.stroke();
}

/**
 * Export JSON project file
 */
export function exportToJSON(nodes: FlowNode[], connectors: FlowConnector[], projectName: string = 'flowchart') {
  const data = {
    version: '1.0',
    title: projectName,
    createdAt: new Date().toISOString(),
    nodes,
    connectors,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.flow.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import JSON project file
 */
export function importFromJSON(file: File): Promise<{ nodes: FlowNode[]; connectors: FlowConnector[]; title?: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
          throw new Error('Invalid flowchart file format');
        }
        resolve({
          nodes: parsed.nodes,
          connectors: parsed.connectors || [],
          title: parsed.title,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
