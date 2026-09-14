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

  const bounds = getDiagramBounds(nodes);
  const padding = 60;
  const exportWidth = bounds.width + padding * 2;
  const exportHeight = bounds.height + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = exportWidth * scale;
  canvas.height = exportHeight * scale;
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  ctx.scale(scale, scale);

  // Background
  if (!transparentBg) {
    ctx.fillStyle = '#090d16'; // Deep dark canvas color
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Draw subtle grid dots
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
    ctx.strokeStyle = conn.strokeColor || '#64748b';
    ctx.lineWidth = conn.strokeWidth || 2;
    if (conn.strokeStyle === 'dashed') {
      ctx.setLineDash([6, 4]);
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
      drawArrowHead(ctx, end, conn.toPort, conn.strokeColor || '#64748b');
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

  // Export based on format
  if (format === 'jpg' || format === 'jpeg') {
    // Convert to JPG
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    downloadDataUrl(dataUrl, fileName);
  } else {
    // Default PNG
    const dataUrl = canvas.toDataURL('image/png');
    downloadDataUrl(dataUrl, fileName);
  }
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
    case 'start-end': {
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
    case 'subprocess': {
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
    case 'cloud': {
      ctx.roundRect(x, y, width, height, 16);
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
