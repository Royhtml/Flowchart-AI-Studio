/**
 * Female TTS (Text-to-Speech) Narration Service for Flowchart Studio
 * Specializes in clear, expressive female voice narration in Indonesian & English
 * during workflow / flowchart animation runs.
 */

import { FlowNode } from '../types';

let currentUtterance: SpeechSynthesisUtterance | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Initialize speech synthesis voices
export function initVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };

    // Fallback timeout
    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    }, 300);
  });
}

/**
 * Find best female voice, prioritizing Indonesian female voice, then natural international female voices.
 */
export function getBestFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Indonesian female voice keywords
  const indoFemaleKeywords = ['damayanti', 'gadis', 'indonesia female', 'id-id-female', 'id_id'];
  const indoVoices = voices.filter((v) => v.lang.toLowerCase().includes('id'));

  for (const v of indoVoices) {
    const nameLower = v.name.toLowerCase();
    if (indoFemaleKeywords.some((kw) => nameLower.includes(kw)) || nameLower.includes('female') || nameLower.includes('wanita') || nameLower.includes('perempuan')) {
      return v;
    }
  }

  // If any Indonesian voice exists, use it (and we will tune pitch for female tone)
  if (indoVoices.length > 0) {
    return indoVoices[0];
  }

  // 2. High-quality female voices (English / Multilingual)
  const popularFemaleNames = [
    'samantha', 'victoria', 'karen', 'zira', 'jenny', 'aria', 'natasha', 'lisa', 'sarah',
    'google bahasa indonesia', 'google uk english female', 'google us english', 'female'
  ];

  for (const name of popularFemaleNames) {
    const found = voices.find((v) => v.name.toLowerCase().includes(name));
    if (found) return found;
  }

  // 3. Any voice marked as female in name or URI
  const anyFemale = voices.find((v) => 
    v.name.toLowerCase().includes('female') || 
    v.name.toLowerCase().includes('woman') ||
    v.voiceURI.toLowerCase().includes('female')
  );
  if (anyFemale) return anyFemale;

  // Fallback to first available voice
  return voices[0] || null;
}

/**
 * Format natural spoken description for a flowchart node in Indonesian
 */
export function getNodeSpokenText(node: FlowNode, stepCount: number): string {
  const label = (node.label || 'Node').trim();
  const subLabel = node.subLabel ? `. ${node.subLabel}` : '';
  const type = node.type;

  switch (type) {
    case 'start-end':
      if (stepCount <= 1 || label.toLowerCase().includes('mulai') || label.toLowerCase().includes('start')) {
        return `Memulai alur kerja: ${label}`;
      }
      return `Alur kerja selesai: ${label}`;

    case 'decision':
      return `Percabangan logika: ${label}. Menentukan pilihan alur berikutnya.`;

    case 'process':
      return `Langkah proses: ${label}${subLabel}`;

    case 'input-output':
      return `Input output data: ${label}`;

    case 'database':
      return `Akses database: ${label}`;

    case 'document':
    case 'multidocument':
      return `Memproses dokumen: ${label}`;

    case 'delay':
      return `Menunggu jeda: ${label}`;

    case 'manual-input':
      return `Menunggu masukan pengguna: ${label}`;

    case 'manual-operation':
      return `Tindakan operasional: ${label}`;

    case 'cloud':
      return `Layanan cloud: ${label}`;

    default:
      return `Mengeksekusi ${label}${subLabel}`;
  }
}

/**
 * Speak text using female TTS
 */
export function speakFemaleTTS(
  text: string,
  options?: {
    pitch?: number;
    rate?: number;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;

  try {
    // Cancel previous speech to keep real-time sync with flowchart steps
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const femaleVoice = getBestFemaleVoice();

    if (femaleVoice) {
      utterance.voice = femaleVoice;
      utterance.lang = femaleVoice.lang || 'id-ID';
    } else {
      utterance.lang = 'id-ID';
    }

    // Feminine pitch & natural pace
    // Pitch 1.15 - 1.25 gives a bright, melodious feminine voice even on neutral engines
    utterance.pitch = options?.pitch ?? 1.18;
    utterance.rate = options?.rate ?? 1.02;
    utterance.volume = 1.0;

    if (options?.onEnd) {
      utterance.onend = options.onEnd;
    }
    if (options?.onError) {
      utterance.onerror = options.onError;
    }

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Female TTS speech error:', err);
    return false;
  }
}

/**
 * Stop any current speech
 */
export function stopFemaleTTS(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Narrate node execution during simulation
 */
export function speakNodeNarrative(
  node: FlowNode,
  stepCount: number,
  enabled: boolean,
  speed: number = 1
): void {
  if (!enabled) return;
  const text = getNodeSpokenText(node, stepCount);
  const rate = Math.min(1.4, Math.max(0.85, 0.95 * Math.sqrt(speed)));
  speakFemaleTTS(text, { rate });
}

/**
 * Narrate decision branch choice
 */
export function speakBranchNarrative(
  branchLabel: string,
  targetLabel: string,
  enabled: boolean
): void {
  if (!enabled) return;
  const cleanBranch = branchLabel.trim() || 'Lanjut';
  const text = `Memilih jalur ${cleanBranch}, menuju ${targetLabel}`;
  speakFemaleTTS(text);
}

/**
 * Narrate workflow completion
 */
export function speakCompletionNarrative(enabled: boolean): void {
  if (!enabled) return;
  speakFemaleTTS('Seluruh alur kerja telah selesai dijalankan dengan sempurna.');
}

/**
 * Test play female voice sample
 */
export function testPlayFemaleVoice(): void {
  const sampleText = 'Halo! Saya asisten suara perempuan untuk narasi simulasi flowchart Anda.';
  speakFemaleTTS(sampleText);
}
