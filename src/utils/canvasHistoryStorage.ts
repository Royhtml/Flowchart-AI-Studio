import { FlowNode, FlowConnector } from '../types';

export interface CanvasHistoryItem {
  id: string;
  timestamp: number;
  label: string;
  projectName: string;
  nodes: FlowNode[];
  connectors: FlowConnector[];
  nodeCount: number;
  connectorCount: number;
  sizeBytes: number;
}

export const CANVAS_HISTORY_STORAGE_KEY = 'flowchart_studio_canvas_history_v1';
export const MAX_HISTORY_BYTES = 1 * 1024 * 1024; // 1 MB = 1,048,576 bytes

/**
 * Accurately calculate the UTF-8 byte size of a string
 */
export function getUtf8ByteSize(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  // Fallback estimation (UTF-8 bytes per character)
  return new Blob([str]).size;
}

/**
 * Retrieve all canvas history entries from localStorage
 */
export function getCanvasHistory(): CanvasHistoryItem[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  try {
    const raw = localStorage.getItem(CANVAS_HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[CanvasHistory] Failed to read history from localStorage:', err);
  }
  return [];
}

/**
 * Save history array to localStorage, enforcing the strict 1 MB limit.
 * If size exceeds 1 MB, removes oldest entries until under limit.
 */
export function saveCanvasHistory(items: CanvasHistoryItem[]): {
  success: boolean;
  bytesUsed: number;
  totalBytes: number;
  items: CanvasHistoryItem[];
} {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: false, bytesUsed: 0, totalBytes: MAX_HISTORY_BYTES, items };
  }

  let queue = [...items];
  let json = JSON.stringify(queue);
  let bytes = getUtf8ByteSize(json);

  // Automatically trim oldest entries if over 1MB
  while (bytes > MAX_HISTORY_BYTES && queue.length > 1) {
    queue.shift(); // remove the oldest entry
    json = JSON.stringify(queue);
    bytes = getUtf8ByteSize(json);
  }

  // Attempt to write to localStorage with error handling
  try {
    localStorage.setItem(CANVAS_HISTORY_STORAGE_KEY, json);
    return {
      success: true,
      bytesUsed: bytes,
      totalBytes: MAX_HISTORY_BYTES,
      items: queue,
    };
  } catch (err) {
    console.warn('[CanvasHistory] Quota exceeded or error saving, trimming further:', err);
    // Further trim in case localStorage has other keys taking space
    while (queue.length > 1) {
      queue.shift();
      try {
        json = JSON.stringify(queue);
        bytes = getUtf8ByteSize(json);
        localStorage.setItem(CANVAS_HISTORY_STORAGE_KEY, json);
        return {
          success: true,
          bytesUsed: bytes,
          totalBytes: MAX_HISTORY_BYTES,
          items: queue,
        };
      } catch {}
    }
    return {
      success: false,
      bytesUsed: bytes,
      totalBytes: MAX_HISTORY_BYTES,
      items: queue,
    };
  }
}

/**
 * Add a new snapshot to history, automatically calculating size and respecting 1MB limit
 */
export function addCanvasHistorySnapshot(params: {
  label?: string;
  projectName: string;
  nodes: FlowNode[];
  connectors: FlowConnector[];
}): { updatedHistory: CanvasHistoryItem[]; bytesUsed: number; newId: string } {
  const current = getCanvasHistory();
  const timestamp = Date.now();
  const id = `hist-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;

  // Calculate approximate payload size for this single item
  const itemData = {
    nodes: params.nodes,
    connectors: params.connectors,
    projectName: params.projectName,
  };
  const itemBytes = getUtf8ByteSize(JSON.stringify(itemData));

  const newItem: CanvasHistoryItem = {
    id,
    timestamp,
    label: params.label || `Versi ${new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
    projectName: params.projectName || 'Untitled Flowchart',
    nodes: params.nodes,
    connectors: params.connectors,
    nodeCount: params.nodes.length,
    connectorCount: params.connectors.length,
    sizeBytes: itemBytes,
  };

  const updated = [...current, newItem];
  const result = saveCanvasHistory(updated);

  return {
    updatedHistory: result.items,
    bytesUsed: result.bytesUsed,
    newId: id,
  };
}

/**
 * Delete a specific history snapshot by ID
 */
export function deleteCanvasHistoryItem(id: string): CanvasHistoryItem[] {
  const current = getCanvasHistory();
  const filtered = current.filter((item) => item.id !== id);
  const result = saveCanvasHistory(filtered);
  return result.items;
}

/**
 * Clear all canvas history from localStorage
 */
export function clearCanvasHistory(): void {
  try {
    localStorage.removeItem(CANVAS_HISTORY_STORAGE_KEY);
  } catch (err) {
    console.warn('[CanvasHistory] Failed to clear history:', err);
  }
}

/**
 * Get current storage usage statistics
 */
export function getHistoryStorageStats(): {
  bytesUsed: number;
  maxBytes: number;
  percentage: number;
  formattedUsed: string;
  formattedMax: string;
  count: number;
  isNearLimit: boolean;
} {
  const items = getCanvasHistory();
  const json = JSON.stringify(items);
  const bytesUsed = getUtf8ByteSize(json);
  const percentage = Math.min(100, Math.round((bytesUsed / MAX_HISTORY_BYTES) * 1000) / 10);
  const isNearLimit = percentage >= 85;

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  return {
    bytesUsed,
    maxBytes: MAX_HISTORY_BYTES,
    percentage,
    formattedUsed: formatBytes(bytesUsed),
    formattedMax: '1.0 MB',
    count: items.length,
    isNearLimit,
  };
}
