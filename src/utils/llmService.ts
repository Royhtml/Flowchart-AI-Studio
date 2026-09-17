import { LLMConfig, LLMProvider, FlowNode, FlowConnector } from '../types';

const STORAGE_KEY = 'flowchart_studio_llm_settings';

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'custom_local',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  openaiBaseUrl: 'https://api.openai.com/v1',
  claudeApiKey: 'Kamu adalah asisten AI yang pintar dan ramah. Berikan jawaban yang tepat dan JANGAN PERNAH mengulang kalimat yang sama. Jika user mengirim file gambar, kamu hanya bisa melihat nama file tapi tidak bisa memproses visual gambar karena kamu model text-only, jelaskan hal itu dengan sopan.',
  claudeModel: 'claude-3-5-sonnet-20241022',
  customEndpoint: 'http://127.0.0.1:8088/completion',
  customApiKey: '',
  customModel: 'local-llm',
  temperature: 0.2,
};

// System prompt for flowchart DSL generation
const SYSTEM_PROMPT = `You are an Expert Flowchart & System Logic Architect.
Your task is to create or modify flowchart code in "FlowScript DSL" format based on user requests. The user prompt can be in any language (English, Indonesian, Spanish, Japanese, etc.) — always generate valid FlowScript DSL with appropriate descriptive labels.

FLOWSCRIPT DSL SYNTAX FORMAT:
[NODES]
<type>: <id> "<label>" [sub: "<sub_label>"] (x: <x>, y: <y>)

Supported node types:
- terminator : Flow start or end point (Start / End)
- process : Process step, calculation, or system action
- decision : Conditional logic branch (Decision / Condition?)
- input-output : General data input or output
- document : Printed document, report, or form file
- multidocument : Batch files or multiple documents
- predefined-process : Subroutine, separate module, or sub-procedure
- manual-input : User input via keyboard / UI form
- manual-operation : Manual human operational step
- preparation : Variable initialization, initial setup
- delay : Delay, wait duration, waiting queue
- database : Data storage, database repository
- display : Visual UI display, monitor alert, popup
- cloud : Cloud integration, 3rd party API, webhook

[CONNECTORS]
<fromId> -> <toId> "<branch_label>"

IMPORTANT RULES:
1. Node IDs must be alphanumeric with underscores and no spaces (e.g., start, verify_user, process_order, print_receipt, done).
2. For "decision" nodes, always create at least 2 outgoing connectors with clear labels, e.g. "Yes" and "No", or "Valid" and "Invalid".
3. Provide neat (x, y) coordinates (vertical spacing ~110-140px, decision branches ~240px apart) OR you can omit (x, y) and the system will auto-layout.
4. Do not include conversational pleasantries. Return ONLY the valid FlowScript DSL block.`;

/**
 * Load LLM configuration from localStorage
 */
export function getStoredLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LLM_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_LLM_CONFIG, ...parsed };
  } catch {
    return DEFAULT_LLM_CONFIG;
  }
}

/**
 * Save LLM configuration to localStorage
 */
export function saveStoredLLMConfig(config: LLMConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save LLM config to localStorage:', err);
  }
}

// Helper to extract personality/system prompt from config
function getPersonalityPrompt(config: LLMConfig): string {
  return config.claudeApiKey?.trim() || SYSTEM_PROMPT;
}

/**
 * Unified LLM provider caller - routes to appropriate service
 * NO timeout interruption - let fetch complete naturally
 */
async function callLLMProvider(
  prompt: string,
  personality: string,
  config: LLMConfig,
  maxTokens: number
): Promise<string> {
  switch (config.provider) {
    case 'gemini':
      return callGeminiAPI(prompt, personality, config, maxTokens);
    case 'openai':
      return callOpenAIAPI(prompt, personality, config, maxTokens);
    case 'claude':
      return callClaudeAPI(prompt, personality, config, maxTokens);
    case 'custom_local':
      return callCustomLocalAPI(prompt, personality, config, maxTokens);
    default:
      throw new Error(`Unrecognized LLM provider: ${config.provider}`);
  }
}

/**
 * Call Google Gemini API
 * No timeout, only network error handling
 */
async function callGeminiAPI(
  prompt: string,
  personality: string,
  config: LLMConfig,
  maxTokens: number
): Promise<string> {
  const apiKey = config.geminiApiKey.trim();
  if (!apiKey) {
    throw new Error('Google Gemini API Key is missing. Please enter your Gemini API Key in the LLM Settings menu.');
  }

  const model = config.geminiModel || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${personality}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: config.temperature ?? 0.2,
          maxOutputTokens: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini returned empty response');
    }

    return cleanDSLResponse(rawText);
  } catch (err: any) {
    if (err.message.includes('fetch')) {
      throw new Error('Tidak bisa terhubung ke Gemini API. Cek koneksi internet dan API key.');
    }
    throw err;
  }
}

/**
 * Call OpenAI API
 * No timeout, only network error handling
 */
async function callOpenAIAPI(
  prompt: string,
  personality: string,
  config: LLMConfig,
  maxTokens: number
): Promise<string> {
  const apiKey = config.openaiApiKey.trim();
  if (!apiKey) {
    throw new Error('OpenAI API Key is missing. Please enter your OpenAI API Key in the LLM Settings menu.');
  }

  const baseUrl = (config.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;
  const model = config.openaiModel || 'gpt-4o-mini';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: config.temperature ?? 0.2,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: personality },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error('OpenAI returned empty response');
    }

    return cleanDSLResponse(rawText);
  } catch (err: any) {
    if (err.message.includes('fetch')) {
      throw new Error('Tidak bisa terhubung ke OpenAI API. Cek koneksi internet dan API key.');
    }
    throw err;
  }
}

/**
 * Call Claude (Anthropic) API
 * No timeout, only network error handling
 */
async function callClaudeAPI(
  prompt: string,
  personality: string,
  config: LLMConfig,
  maxTokens: number
): Promise<string> {
  const apiKey = config.claudeApiKey.trim();
  if (!apiKey) {
    throw new Error('Claude API Key is missing. Please enter your Claude API Key in the LLM Settings menu.');
  }

  const url = 'https://api.anthropic.com/v1/messages';
  const model = config.claudeModel || 'claude-3-5-sonnet-20241022';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: config.temperature ?? 0.2,
        system: personality,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text;
    if (!rawText) {
      throw new Error('Claude returned empty response');
    }

    return cleanDSLResponse(rawText);
  } catch (err: any) {
    if (err.message.includes('fetch')) {
      throw new Error('Tidak bisa terhubung ke Claude API. Cek koneksi internet dan API key.');
    }
    throw err;
  }
}

/**
 * Call Custom Local LLM Endpoint
 * NO timeout - let response complete naturally, only network error handling
 */
async function callCustomLocalAPI(
  prompt: string,
  personality: string,
  config: LLMConfig,
  maxTokens: number
): Promise<string> {
  const endpoint = (config.customEndpoint || 'http://127.0.0.1:8088/completion').trim();
  if (!endpoint) {
    throw new Error('Local LLM endpoint tidak dikonfigurasi (e.g., http://127.0.0.1:8088/completion)');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.customApiKey && config.customApiKey.trim()) {
    headers['Authorization'] = `Bearer ${config.customApiKey.trim()}`;
  }

  const fullPrompt = `<|system|>\n${personality}\n<|user|>\n${prompt}\n<|assistant|>\n`;

  let body: string;
  const isChatCompletions = endpoint.includes('/chat/completions');

  if (isChatCompletions) {
    body = JSON.stringify({
      model: config.customModel || 'local-llm',
      temperature: config.temperature ?? 0.3,
      top_p: 0.95,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: personality },
        { role: 'user', content: prompt },
      ],
    });
  } else {
    // Default llama.cpp / text completion endpoint format
    body = JSON.stringify({
      prompt: fullPrompt,
      temperature: config.temperature ?? 0.3,
      top_p: 0.95,
      n_predict: maxTokens,
      stream: false,
      stop: ['<|end|>', '<|user|>', '</s>', 'User:', 'Assistant:'],
    });
  }

  try {
    // NO ABORT CONTROLLER - biarkan fetch complete secara natural tanpa timeout
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Local server error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    // Support various response formats
    let rawText = '';
    if (typeof data.content === 'string') {
      rawText = data.content;
    } else if (typeof data.response === 'string') {
      rawText = data.response;
    } else if (typeof data.text === 'string') {
      rawText = data.text;
    } else if (typeof data.choices === 'string') {
      rawText = data.choices;
    } else if (data.result && typeof data.result === 'string') {
      rawText = data.result;
    } else if (Array.isArray(data.choices) && data.choices[0]?.message?.content) {
      rawText = data.choices[0].message.content;
    } else if (Array.isArray(data.choices) && data.choices[0]?.text) {
      rawText = data.choices[0].text;
    } else if (Array.isArray(data) && data[0]?.generated_text) {
      rawText = data[0].generated_text;
    } else {
      rawText = JSON.stringify(data);
    }

    return cleanDSLResponse(rawText);
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message.includes('fetch')) {
      throw new Error(
        `Tidak bisa terhubung ke server ${endpoint}.\nPastikan server sudah running (e.g. llama-server --port 8088) dengan CORS enabled (--cors-allow-origin *).`
      );
    }
    throw err;
  }
}

/**
 * Generate Flowchart FlowScript DSL - LEAN OPTIMIZED (2048 tokens)
 * Focused solely on flowchart generation with minimal context
 * Uses STRICT prompt for CLEAN DSL format output
 */
export async function generateFlowchartWithAIFlow(
  userPrompt: string,
  currentProjectCode: string,
  config: LLMConfig
): Promise<{ reply: string; generatedDSL?: string }> {
  // STRICT system prompt for CLEAN DSL generation - NO markdown, NO explanations
  const strictSystemPrompt = `You are a flowchart DSL generator. Generate ONLY FlowScript DSL code, nothing else.

STRICT RULES:
1. OUTPUT ONLY the DSL code - no explanations, no markdown blocks, no text before or after
2. Start with [NODES] section
3. Follow with [CONNECTORS] section
4. Auto-generate coordinates: x=340 (center main flow), y starts at 60 and increments by 130-150
5. For branches: x=225 (left branch), x=455 (right branch)
6. Node IDs: n1, n2, n3, ... (simple sequential numbering)
7. Include ALL connectors with descriptive labels
8. Supported types: terminator, process, decision, input-output, database, document, cloud, predefined-process, manual-input, display, delay
9. NO markdown code blocks - output raw DSL only
10. NO explanations, NO descriptions, ONLY DSL code

EXAMPLE (this is the ONLY output format):
[NODES]
terminator: n1 "Start" (x: 340, y: 60)
input-output: n2 "Input Data" (x: 340, y: 190)
decision: n3 "Valid?" (x: 340, y: 320)
process: n4 "Process" (x: 225, y: 450)
process: n5 "Error" (x: 455, y: 450)
terminator: n6 "End" (x: 340, y: 580)

[CONNECTORS]
n1 -> n2 "Begin"
n2 -> n3 "Check"
n3 -> n4 "Yes"
n3 -> n5 "No"
n4 -> n6 "Complete"
n5 -> n2 "Retry"`;

  const leanPrompt = currentProjectCode.trim()
    ? `User: ${userPrompt}\nCurrent code:\n${currentProjectCode}\nGenerate updated FlowScript DSL:`
    : `User: ${userPrompt}\nGenerate FlowScript DSL:`;

  try {
    const rawResponse = await callLLMProvider(leanPrompt, strictSystemPrompt, config, 2048);

    let generatedDSL: string | undefined;
    let reply = rawResponse;

    // Extract DSL if present (handle markdown blocks)
    const dslMatch = rawResponse.match(/```(?:flowscript|dsl)?\s*([\s\S]*?\[NODES\][\s\S]*?)\s*```/i);
    if (dslMatch) {
      generatedDSL = cleanDSLResponse(dslMatch[1]);
      reply = rawResponse.replace(/```(?:flowscript|dsl)?\s*([\s\S]*?\[NODES\][\s\S]*?)\s*```/i, '').trim();
    } else if (rawResponse.includes('[NODES]')) {
      const idx = rawResponse.indexOf('[NODES]');
      generatedDSL = cleanDSLResponse(rawResponse.substring(idx));
      reply = rawResponse.substring(0, idx).trim();
    }

    return {
      reply: reply || 'Flowchart generated successfully',
      generatedDSL,
    };
  } catch (err: any) {
    throw new Error(`Flowchart generation failed: ${err.message}`);
  }
}

/**
 * Explain Flowchart in Detail - LEAN OPTIMIZED (1024 tokens)
 * Focused explanation with minimal overhead
 * 
 * @param flowchartDSL - The flowchart code to explain
 * @param userQuery - The specific question or explanation request
 * @param config - LLM configuration
 * @param contextType - Type of explanation: "overview" | "specific" | "optimization"
 */
export async function explainFlowchartDetail(
  flowchartDSL: string,
  userQuery: string,
  config: LLMConfig,
  contextType: 'overview' | 'specific' | 'optimization' = 'specific'
): Promise<{ reply: string; generatedDSL?: string }> {
  const personality = getPersonalityPrompt(config);

  let contextPrompt = '';
  if (contextType === 'overview') {
    contextPrompt = `Provide a high-level overview of what this flowchart does. Keep it brief, no repetition.`;
  } else if (contextType === 'optimization') {
    contextPrompt = `Focus on optimization opportunities and improvements. What can be made more efficient?`;
  } else {
    contextPrompt = `Answer the specific question asked. Be concise and direct.`;
  }

  const leanPrompt = `${contextPrompt}

Diagram:
${flowchartDSL}

Question: ${userQuery}

IMPORTANT: 
- NEVER repeat the same explanation twice
- Be concise and precise
- Only answer what is asked, no padding
- No markdown formatting
- Maximum 3-4 sentences`;

  try {
    const reply = await callLLMProvider(leanPrompt, personality, config, 1024);

    return {
      reply: reply || 'No explanation available',
    };
  } catch (err: any) {
    throw new Error(`Penjelasan gagal: ${err.message}`);
  }
}

/**
 * Chat with Flowchart Bot - LEAN OPTIMIZED (2048 tokens, last 2 history)
 * Conversation mode with minimal history to save tokens
 */
export async function chatWithFlowchartBot(
  userMessage: string,
  currentDSL: string,
  history: BotChatMessage[],
  config: LLMConfig
): Promise<{ reply: string; generatedDSL?: string }> {
  const personality = getPersonalityPrompt(config);

  // Only use last 2 messages from history
  const recentHistory = history.slice(-2);
  const historyText = recentHistory
    .map((m) => `${m.role === 'user' ? 'U' : 'A'}: ${m.content.substring(0, 80)}`)
    .join('\n') || 'None';

  const leanPrompt = `History: ${historyText}\nCanvas: ${currentDSL.substring(0, 200)}\nUser: ${userMessage}\nReply:`;

  try {
    const rawResponse = await callLLMProvider(leanPrompt, personality, config, 2048);

    let generatedDSL: string | undefined;
    let reply = rawResponse;

    // Extract DSL if present
    const dslMatch = rawResponse.match(/```(?:flowscript|dsl)?\s*([\s\S]*?\[NODES\][\s\S]*?)\s*```/i);
    if (dslMatch) {
      generatedDSL = cleanDSLResponse(dslMatch[1]);
      reply = rawResponse.replace(/```(?:flowscript|dsl)?\s*([\s\S]*?\[NODES\][\s\S]*?)\s*```/i, '').trim();
    } else if (rawResponse.includes('[NODES]')) {
      const idx = rawResponse.indexOf('[NODES]');
      if (idx !== -1) {
        generatedDSL = cleanDSLResponse(rawResponse.substring(idx));
        reply = rawResponse.substring(0, idx).trim();
      }
    }

    return {
      reply: reply || 'Terima kasih atas pertanyaannya',
      generatedDSL,
    };
  } catch (err: any) {
    throw new Error(`Chat gagal: ${err.message}`);
  }
}

/**
 * LEGACY: Old function signature for backward compatibility
 * Calls new chatWithFlowchartBot internally
 */
export async function chatWithFlowchartBotLegacy(
  userMessage: string,
  currentDSL: string,
  history: BotChatMessage[],
  config: LLMConfig
): Promise<{ reply: string; generatedDSL?: string }> {
  return chatWithFlowchartBot(userMessage, currentDSL, history, config);
}

/**
 * Clean markdown formatting, strip special tokens, and extract pure DSL code
 */
export function cleanDSLResponse(text: string): string {
  // Strip special tokens like <|...|>, <||, </s>, <|im_end|>, etc.
  let cleaned = text
    .replace(/<\|[^>]*\|?>/g, '')
    .replace(/<\|+/g, '')
    .replace(/<\/s>/g, '')
    .trim();

  // If wrapped in ```dsl ... ``` or ```flowscript ... ``` or ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:dsl|flowscript|markdown|txt)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Ensure [NODES] is present
  if (!cleaned.includes('[NODES]')) {
    // If LLM forgot the [NODES] header, try to prepend it if lines look like nodes
    if (/^[a-zA-Z0-9_-]+:\s*[a-zA-Z0-9_-]+/m.test(cleaned)) {
      cleaned = `[NODES]\n${cleaned}`;
    }
  }

  // If there is trailing prose after the last valid connector or node line, clean it
  const lines = cleaned.split('\n');
  let lastSyntaxIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (
      l.includes('->') ||
      l.includes('-->') ||
      l.includes('=>') ||
      /^[a-zA-Z0-9_-]+:\s*[a-zA-Z0-9_-]+/.test(l) ||
      l.toUpperCase() === '[CONNECTORS]' ||
      l.toUpperCase() === '[CONNECTIONS]' ||
      l.toUpperCase() === '[NODES]'
    ) {
      lastSyntaxIdx = i;
      break;
    }
  }

  if (lastSyntaxIdx !== -1 && lastSyntaxIdx < lines.length - 1) {
    cleaned = lines.slice(0, lastSyntaxIdx + 1).join('\n').trim();
  }

  return cleaned;
}

export interface BotChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  generatedDSL?: string;
}

export const BOT_ASSISTANT_SYSTEM_PROMPT = `You are FlowChart AI — a specialized, high-velocity AI assistant designed like Gemini, Claude, and ChatGPT for flowcharting, system architectures, and process logic.

CRITICAL INSTRUCTIONS:
1. EXTREMELY CONCISE & POINT-BASED (JAWAB SINGKAT & SESUAI POIN UTAMA):
   - Always respond directly to the question focusing strictly on MAIN KEY POINTS ONLY (hanya poin-poin utama).
   - NEVER repeat the same explanation twice in a conversation
   - Be concise and precise
   - Only answer what is asked, no padding
   - Strict format structure:
     • Exactly 1 brief, crisp introductory sentence.
     • Exactly 2 to 4 bullet points (•) summarizing key takeaways.
   - Absolutely NO conversational filler, no greetings ("Halo!", "Tentu!"), no preamble, no polite trailing remarks ("Semoga membantu!").

2. MATCH USER LANGUAGE:
   - Bahasa Indonesia → Bahasa Indonesia
   - English → English

3. CODE GENERATION RULE:
   - If user asks a question/explanation, provide ONLY the concise bullet points. DO NOT output code blocks.
   - ONLY when user explicitly commands to CREATE / BUILD / GENERATE a diagram (e.g., "buatkan flowchart", "create diagram", "bikin alur"):
     1. Provide 2-3 brief bullet points outlining the steps.
     2. Provide FlowScript DSL wrapped in:
\`\`\`flowscript
[NODES]
<type>: <id> "<label>"
[CONNECTORS]
<fromId> -> <toId> "<label>"
\`\`\`
Supported types: start_end, process, decision, input_output, database, document, delay, note, cloud, manual_input, internal_storage, display.

4. QUALITY RULES:
   - Remove all markdown syntax from responses (no **, no ###, no •)
   - Return plain, readable text
   - If code is returned, make it clean and properly formatted`;

/**
 * Quick ping test for checking LLM connection status
 */
export async function testLLMConnection(config: LLMConfig): Promise<{ success: boolean; message: string }> {
  try {
    const personality = getPersonalityPrompt(config);
    const testResult = await callLLMProvider(
      'Create a simple diagram: Start -> Process -> End',
      personality,
      config,
      512
    );
    if (testResult && testResult.includes('[NODES]')) {
      return { success: true, message: 'Connection successful! Model responded with valid FlowScript DSL format.' };
    }
    return { success: true, message: 'Connection successful, model response received.' };
  } catch (err: any) {
    return { success: false, message: err.message || String(err) };
  }
}

export interface CanvasDetailContext {
  projectName: string;
  nodes: FlowNode[];
  connectors: FlowConnector[];
}

export interface DetailAIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Builds a structured, high-density analysis representation of the canvas
 */
export function buildCanvasTopologySummary(context: CanvasDetailContext): {
  summaryText: string;
  nodeCount: number;
  connectorCount: number;
  decisionCount: number;
  entryNodes: FlowNode[];
  exitNodes: FlowNode[];
  isolatedNodes: FlowNode[];
} {
  const { projectName, nodes, connectors } = context;

  const nodeMap = new Map<string, FlowNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const incomingCounts = new Map<string, number>();
  const outgoingCounts = new Map<string, number>();
  nodes.forEach((n) => {
    incomingCounts.set(n.id, 0);
    outgoingCounts.set(n.id, 0);
  });

  connectors.forEach((c) => {
    incomingCounts.set(c.toNodeId, (incomingCounts.get(c.toNodeId) || 0) + 1);
    outgoingCounts.set(c.fromNodeId, (outgoingCounts.get(c.fromNodeId) || 0) + 1);
  });

  const entryNodes = nodes.filter(
    (n) =>
      (incomingCounts.get(n.id) === 0 && (outgoingCounts.get(n.id) || 0) > 0) ||
      n.label.toLowerCase().includes('mulai') ||
      n.label.toLowerCase().includes('start')
  );

  const exitNodes = nodes.filter(
    (n) =>
      (outgoingCounts.get(n.id) === 0 && (incomingCounts.get(n.id) || 0) > 0) ||
      n.label.toLowerCase().includes('selesai') ||
      n.label.toLowerCase().includes('end')
  );

  const isolatedNodes = nodes.filter(
    (n) => (incomingCounts.get(n.id) || 0) === 0 && (outgoingCounts.get(n.id) || 0) === 0
  );

  const decisionNodes = nodes.filter((n) => n.type === 'decision');

  let summaryText = `PROJECT CANVAS: "${projectName || 'Interactive Flowchart'}"\n`;
  summaryText += `METRICS: ${nodes.length} Nodes, ${connectors.length} Connectors, ${decisionNodes.length} Decision Branches\n\n`;

  summaryText += `NODES LIST:\n`;
  nodes.forEach((n, idx) => {
    summaryText += `${idx + 1}. [${n.type.toUpperCase()}] "${n.label}" (ID: ${n.id})${
      n.subLabel ? ` - Ket: "${n.subLabel}"` : ''
    }\n`;
  });

  summaryText += `\nCONNECTIONS & LOGIC FLOW:\n`;
  if (connectors.length === 0) {
    summaryText += `(Tidak ada koneksi connector antar node)\n`;
  } else {
    connectors.forEach((c, idx) => {
      const from = nodeMap.get(c.fromNodeId)?.label || c.fromNodeId;
      const to = nodeMap.get(c.toNodeId)?.label || c.toNodeId;
      const label = c.label ? ` [Label: "${c.label}"]` : '';
      summaryText += `${idx + 1}. "${from}" ──${label}──▶ "${to}"\n`;
    });
  }

  if (isolatedNodes.length > 0) {
    summaryText += `\nPERINGATAN NODE TERISOLASI (Belum Terhubung):\n`;
    isolatedNodes.forEach((n) => {
      summaryText += `- "${n.label}" (ID: ${n.id})\n`;
    });
  }

  return {
    summaryText,
    nodeCount: nodes.length,
    connectorCount: connectors.length,
    decisionCount: decisionNodes.length,
    entryNodes,
    exitNodes,
    isolatedNodes,
  };
}

/**
 * Built-in high-precision canvas analysis engine for instant offline response
 */
export function getBuiltinDetailAIAnalysis(
  userQuery: string,
  context: CanvasDetailContext
): string {
  const { projectName, nodes, connectors } = context;
  const q = userQuery.toLowerCase().trim();

  if (nodes.length === 0) {
    return `### Canvas Masih Kosong
Canvas Anda saat ini belum memiliki node atau alur.
- Tambahkan node dari toolbar samping kiri (Start/End, Process, Decision, Database).
- Hubungkan dengan menarik garis konektor.
- Setelah ada diagram di canvas, **Detail AI** akan secara otomatis membedah arsitektur, mendeteksi bottleneck, dan membuat SOP lengkap untuk Anda.`;
  }

  const topology = buildCanvasTopologySummary(context);
  const nodeMap = new Map<string, FlowNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Mode 1: Penjelasan Alur Lengkap / Architecture Breakdown
  if (
    q.includes('jelas') ||
    q.includes('alur') ||
    q.includes('langkah') ||
    q.includes('arsitektur') ||
    q.includes('rangkum') ||
    q.includes('ringkas') ||
    q === 'jelaskan seluruh alur'
  ) {
    let text = `### 📖 Analisis Arsitektur Proyek: "${projectName || 'Flowchart Studio'}"\n\n`;
    text += `Diagram ini terdiri dari **${nodes.length} node** dan **${connectors.length} jalur konektor** dengan **${topology.decisionCount} titik percabangan logika**.\n\n`;

    text += `#### 1. Titik Awal (Entry Point):\n`;
    if (topology.entryNodes.length > 0) {
      topology.entryNodes.forEach((n) => {
        text += `- **${n.label}** (${n.type}): Titik awal dimulainya eksekusi workflow.\n`;
      });
    } else {
      text += `- Titik awal dimulai dari node pertama: **${nodes[0].label}**.\n`;
    }

    text += `\n#### 2. Urutan Logika & Alur Proses:\n`;
    connectors.forEach((c, idx) => {
      const from = nodeMap.get(c.fromNodeId)?.label || c.fromNodeId;
      const to = nodeMap.get(c.toNodeId)?.label || c.toNodeId;
      const branch = c.label ? ` *(Kondisi: ${c.label})*` : '';
      text += `${idx + 1}. **${from}** ➔ **${to}**${branch}\n`;
    });

    text += `\n#### 3. Titik Akhir (Termination Point):\n`;
    if (topology.exitNodes.length > 0) {
      topology.exitNodes.forEach((n) => {
        text += `- **${n.label}**: Menandai workflow selesai atau status terminal tercapai.\n`;
      });
    } else {
      text += `- Belum ada node terminal yang berdiri sendiri.\n`;
    }

    if (topology.isolatedNodes.length > 0) {
      text += `\n> ⚠️ **Catatan Sistem:** Terdapat ${topology.isolatedNodes.length} node yang belum memiliki koneksi: ${topology.isolatedNodes.map((n) => `\`${n.label}\``).join(', ')}.`;
    }

    return text;
  }

  // Mode 2: Audit & Bottleneck Check
  if (
    q.includes('audit') ||
    q.includes('bottleneck') ||
    q.includes('error') ||
    q.includes('masalah') ||
    q.includes('cegah') ||
    q.includes('celah') ||
    q.includes('cek bottleneck & node terputus')
  ) {
    let text = `### 🔍 Hasil Audit Alur & Pemeriksaan Bottleneck\n\n`;
    const issues: string[] = [];
    const healthy: string[] = [];

    // Check isolated nodes
    if (topology.isolatedNodes.length > 0) {
      issues.push(
        `**${topology.isolatedNodes.length} Node Terisolasi (Dangling):** Node ${topology.isolatedNodes.map((n) => `"${n.label}"`).join(', ')} tidak memiliki jalur masuk atau keluar. Pengguna tidak akan pernah mencapai node ini saat simulasi.`
      );
    } else {
      healthy.push('Semua node memiliki konektivitas dalam canvas.');
    }

    // Check decision node branches
    const decisions = nodes.filter((n) => n.type === 'decision');
    decisions.forEach((d) => {
      const outgoing = connectors.filter((c) => c.fromNodeId === d.id);
      if (outgoing.length < 2) {
        issues.push(
          `**Percabangan Tidak Lengkap pada "${d.label}":** Node decision ini baru memiliki ${outgoing.length} jalur keluar. Idealnya minimal ada 2 cabang (misal: "Ya/Tidak" atau "Berhasil/Gagal").`
        );
      } else {
        healthy.push(`Node percabangan "${d.label}" memiliki ${outgoing.length} kondisi cabang.`);
      }
    });

    // Check start & end
    const hasStart = nodes.some(
      (n) => n.type === 'start-end' && (n.label.toLowerCase().includes('start') || n.label.toLowerCase().includes('mulai'))
    );
    const hasEnd = nodes.some(
      (n) => n.type === 'start-end' && (n.label.toLowerCase().includes('end') || n.label.toLowerCase().includes('selesai'))
    );

    if (!hasStart) {
      issues.push('**Tidak ada node Start standar:** Disarankan menambahkan node `start-end` berlabel "Mulai".');
    }
    if (!hasEnd) {
      issues.push('**Tidak ada node End terminal:** Disarankan menutup setiap alur akhir dengan node "Selesai".');
    }

    text += `#### Status Kesehatan Alur:\n`;
    if (issues.length === 0) {
      text += `✅ **Alur Sehat (100% Valid):** Tidak ditemukan node menggantung atau percabangan buntu.\n\n`;
    } else {
      text += `Ditemukan **${issues.length} poin perhatian** yang perlu ditinjau:\n`;
      issues.forEach((item, idx) => {
        text += `${idx + 1}. ${item}\n`;
      });
      text += `\n`;
    }

    if (healthy.length > 0) {
      text += `#### Parameter Positif:\n`;
      healthy.forEach((h) => {
        text += `• ${h}\n`;
      });
    }

    return text;
  }

  // Mode 3: Buat SOP & Dokumentasi Teknis
  if (
    q.includes('sop') ||
    q.includes('dokumen') ||
    q.includes('spesifikasi') ||
    q.includes('panduan') ||
    q.includes('buat dokumentasi & sop proyek')
  ) {
    let text = `### 📋 Standar Operasional Prosedur (SOP) & Dokumentasi Teknis\n\n`;
    text += `**Nama Dokumen:** SOP Alur Kerja - ${projectName || 'Interactive Flowchart Studio'}\n`;
    text += `**Tanggal Analisis:** ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}\n`;
    text += `**Versi Alur:** 1.0 (Canvas Build)\n\n`;

    text += `#### I. TUJUAN (OBJECTIVE)\n`;
    text += `Dokumen ini mengatur tata kelola dan urutan operasional alur kerja **${projectName}** untuk memastikan setiap proses dieksekusi secara terstruktur, konsisten, dan minim kesalahan.\n\n`;

    text += `#### II. ENTITAS & TAHAPAN KERJA\n`;
    text += `| No | Tahap / Node | Tipe | Peran & Aksi |\n`;
    text += `|---|---|---|---|\n`;
    nodes.forEach((n, idx) => {
      text += `| ${idx + 1} | **${n.label}** | \`${n.type}\` | ${n.subLabel || 'Mengeksekusi instruksi kerja spesifik'} |\n`;
    });

    text += `\n#### III. MATRIX KEPUTUSAN & ESKALASI\n`;
    const decisions = nodes.filter((n) => n.type === 'decision');
    if (decisions.length > 0) {
      decisions.forEach((d) => {
        const out = connectors.filter((c) => c.fromNodeId === d.id);
        text += `- **Titik Evaluasi: ${d.label}**\n`;
        out.forEach((c) => {
          const dest = nodeMap.get(c.toNodeId)?.label || c.toNodeId;
          text += `  • Jika **${c.label || 'Kondisi terpenuhi'}** ➔ Lanjut ke **${dest}**\n`;
        });
      });
    } else {
      text += `Alur ini bersifat linear berurutan tanpa percabangan ganda.\n`;
    }

    text += `\n#### IV. PENUTUP & REKOMENDASI AUDIT\n`;
    text += `Setiap perubahan pada canvas harus diuji ulang menggunakan fitur simulasi animasi dan disinkronkan dengan dokumen SOP ini.`;

    return text;
  }

  // Mode 4: Saran Optimasi & Rekomendasi
  if (
    q.includes('optimasi') ||
    q.includes('saran') ||
    q.includes('tingkat') ||
    q.includes('efisiensi') ||
    q.includes('saran optimasi alur')
  ) {
    let text = `### 💡 Rekomendasi & Saran Optimasi Alur Canvas\n\n`;
    text += `Berdasarkan analisis topologi diagram **${projectName}**:\n\n`;

    text += `1. **Otomatisasi Validasi:** Tambahkan pemeriksaan awal (pre-validation) sebelum node yang memerlukan komputasi berat atau akses database.\n`;
    text += `2. **Fallback & Graceful Degradation:** Pastikan setiap percabangan kegagalan memiliki alur pemulihan (misal: "Retry" atau "Kirim Notifikasi Admin").\n`;
    text += `3. **Standarisasi Penamaan Cabang:** Berikan label eksplisit pada setiap konektor keluar dari node decision (seperti *"Ya/Tidak"* atau *"Lolos/Gagal"*) agar mudah dibaca tim.\n`;
    text += `4. **Visual Grouping:** Beri warna berbeda pada node kritis (misal warna Amber untuk Decision, Emerald untuk Start/End, dan Cyan untuk Process utama).\n`;

    return text;
  }

  // Default: Contextual specific Q&A
  let text = `### 💬 Jawaban Detail AI untuk Proyek "${projectName || 'Flowchart'}"\n\n`;
  text += `Pertanyaan Anda: *"^${userQuery}"*\n\n`;

  // Search if any node matches the query
  const matchedNodes = nodes.filter(
    (n) => q.includes(n.label.toLowerCase()) || n.label.toLowerCase().includes(q)
  );

  if (matchedNodes.length > 0) {
    text += `Ditemukan node yang terkait dengan pertanyaan Anda:\n`;
    matchedNodes.forEach((n) => {
      const incoming = connectors.filter((c) => c.toNodeId === n.id);
      const outgoing = connectors.filter((c) => c.fromNodeId === n.id);

      text += `\n• **Node: ${n.label}** (\`${n.type}\`)\n`;
      if (n.subLabel) text += `  - Keterangan: ${n.subLabel}\n`;
      text += `  - Jalur Masuk: ${
        incoming.length > 0
          ? incoming.map((c) => `"${nodeMap.get(c.fromNodeId)?.label || c.fromNodeId}"`).join(', ')
          : '*(Tidak ada jalur masuk)*'
      }\n`;
      text += `  - Jalur Keluar: ${
        outgoing.length > 0
          ? outgoing
              .map(
                (c) =>
                  `"${nodeMap.get(c.toNodeId)?.label || c.toNodeId}"${c.label ? ` (${c.label})` : ''}`
              )
              .join(', ')
          : '*(Tidak ada jalur keluar)*'
      }\n`;
    });
  } else {
    text += `Diagram canvas saat ini memiliki **${nodes.length} node** terhubung oleh **${connectors.length} konektor**.\n\n`;
    text += `• **Ringkasan Komponen:** Meliputi tahapan ${nodes.slice(0, 4).map((n) => `"${n.label}"`).join(', ')}${nodes.length > 4 ? ', dan lainnya' : ''}.\n`;
    text += `• **Kesiapan Eksekusi:** Seluruh diagram dapat dijalankan secara langsung dengan fitur Simulasi / Animasi dengan narasi TTS suara perempuan.\n\n`;
    text += `Anda dapat memilih tombol pintasan di atas untuk melihat **Analisis Arsitektur**, **Audit Bottleneck**, atau **SOP Dokumen** secara instan.`;
  }

  return text;
}

/**
 * Chat with Detail AI specifically discussing the canvas project
 */
export async function chatWithCanvasDetailAI(
  userQuery: string,
  context: CanvasDetailContext,
  history: DetailAIChatMessage[] = [],
  config?: LLMConfig
): Promise<string> {
  const currentConfig = config || getStoredLLMConfig();
  const topology = buildCanvasTopologySummary(context);

  // If no external provider configured with key, use instant offline analysis
  const hasGeminiKey = currentConfig.geminiApiKey?.trim();
  const hasOpenAIKey = currentConfig.openaiApiKey?.trim();
  const hasClaudeKey = currentConfig.claudeApiKey?.trim();
  const hasLocal = currentConfig.provider === 'custom_local' && currentConfig.customEndpoint?.trim();

  if (!hasGeminiKey && !hasOpenAIKey && !hasClaudeKey && !hasLocal) {
    return getBuiltinDetailAIAnalysis(userQuery, context);
  }

  const systemPrompt = `You are "Detail AI", a dedicated systems architect, process auditor, and technical advisor specializing EXCLUSIVELY in deeply analyzing, discussing, evaluating, and documenting the user's specific flowchart canvas project.

CURRENT CANVAS CONTEXT:
${topology.summaryText}

RULES:
1. Always base your answers directly on the nodes, labels, types, and connections in this specific project canvas.
2. Structure your answers with clear Markdown: headings (###, ####), bold highlights, bullet points, and tables where appropriate.
3. Respond in the same language as the user (Bahasa Indonesia or English). Default to Bahasa Indonesia.
4. If the user asks for architecture explanation, step-by-step audit, bottleneck check, or SOP documentation, provide comprehensive, high-craft, professional output.`;

  try {
    const promptWithContext = `USER QUESTION ABOUT THIS CANVAS PROJECT:\n${userQuery}`;
    const personality = getPersonalityPrompt(currentConfig);

    const result = await callLLMProvider(promptWithContext, systemPrompt, currentConfig, 2048);
    if (result) {
      return result;
    }
  } catch (err) {
    console.warn('Detail AI external call failed, fallback to built-in:', err);
  }

  // Fallback to high-quality built-in analyzer
  return getBuiltinDetailAIAnalysis(userQuery, context);
}

/**
 * Saran AI - Suggestion & Recommendation Engine
 * Provides concrete improvements for flowchart optimization
 * 
 * @param flowchartDSL - The flowchart code (not used, generates from context)
 * @param context - Canvas detail context with nodes and connectors
 * @param config - LLM configuration
 * @returns Numbered suggestions for improvement (no repeating chart info)
 */
export async function getSaranAI(
  flowchartDSL: string,
  context: CanvasDetailContext,
  config: LLMConfig
): Promise<string> {
  const topology = buildCanvasTopologySummary(context);
  const currentConfig = config || getStoredLLMConfig();

  // Check if external provider is configured
  const hasGeminiKey = currentConfig.geminiApiKey?.trim();
  const hasOpenAIKey = currentConfig.openaiApiKey?.trim();
  const hasClaudeKey = currentConfig.claudeApiKey?.trim();
  const hasLocal = currentConfig.provider === 'custom_local' && currentConfig.customEndpoint?.trim();

  const systemPrompt = `You are "Saran AI", a specialized improvement recommendation engine for flowchart optimization.

FLOWCHART STRUCTURE:
${topology.summaryText}

TASK: Provide exactly 3-5 concrete, actionable suggestions to improve this flowchart.

OUTPUT FORMAT: Plain numbered list (1. 2. 3. etc), no markdown, no extra explanation.
Each suggestion should be 1-2 sentences, specific, and actionable.

FOCUS AREAS:
- Process efficiency and optimization
- Error handling and edge cases
- Flow clarity and path optimization
- Security and validation checkpoints
- Performance bottlenecks`;

  try {
    const prompt = 'Based on the flowchart structure, provide specific improvement suggestions.';
    const result = await callLLMProvider(prompt, systemPrompt, currentConfig, 1200);
    return result?.trim() || 'Unable to generate suggestions. Try with a different LLM configuration.';
  } catch (err: any) {
    console.error('[getSaranAI] Error:', err);
    throw new Error(`Saran AI analysis failed: ${err.message}`);
  }
}

/**
 * Nilai AI - Rating & Analysis Engine
 * Provides structured quality assessment of flowchart
 * 
 * @param flowchartDSL - The flowchart code (not used, generates from context)
 * @param context - Canvas detail context with nodes and connectors
 * @param config - LLM configuration
 * @returns Structured analysis with score, strengths, weaknesses (no repeating chart info)
 */
export async function getNilaiAI(
  flowchartDSL: string,
  context: CanvasDetailContext,
  config: LLMConfig
): Promise<string> {
  const topology = buildCanvasTopologySummary(context);
  const currentConfig = config || getStoredLLMConfig();

  // Check if external provider is configured
  const hasGeminiKey = currentConfig.geminiApiKey?.trim();
  const hasOpenAIKey = currentConfig.openaiApiKey?.trim();
  const hasClaudeKey = currentConfig.claudeApiKey?.trim();
  const hasLocal = currentConfig.provider === 'custom_local' && currentConfig.customEndpoint?.trim();

  const systemPrompt = `You are "Nilai AI", a flowchart quality assessment and rating engine.

FLOWCHART STRUCTURE:
${topology.summaryText}

TASK: Rate and analyze this flowchart comprehensively. Provide concise, actionable feedback.

OUTPUT FORMAT (Plain text, no markdown, no extra explanation):
QUALITY SCORE: [0-100]
STRENGTHS: [2-3 aspects, separated by commas]
WEAKNESSES: [2-3 aspects, separated by commas]
TOP RECOMMENDATION: [Single most important improvement]

Be direct and specific. No flowchart explanation or repetition.`;

  try {
    const prompt = 'Provide a quality assessment of this flowchart with score, strengths, weaknesses, and top recommendation.';
    const result = await callLLMProvider(prompt, systemPrompt, currentConfig, 1000);
    return result?.trim() || 'Unable to generate assessment. Try with a different LLM configuration.';
  } catch (err: any) {
    console.error('[getNilaiAI] Error:', err);
    throw new Error(`Nilai AI analysis failed: ${err.message}`);
  }
}
