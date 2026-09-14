import { LLMConfig, LLMProvider } from '../types';

const STORAGE_KEY = 'flowchart_studio_llm_settings';

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'custom_local',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  openaiBaseUrl: 'https://api.openai.com/v1',
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-5',
  customEndpoint: 'http://127.0.0.1:8088/completion',
  customApiKey: '',
  customModel: 'local-model',
  temperature: 0.2,
};

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
 * Generate Flowchart FlowScript DSL using the configured LLM
 */
export async function generateFlowchartWithLLM(
  userPrompt: string,
  currentProjectCode: string,
  config: LLMConfig
): Promise<string> {
  const promptContext = currentProjectCode.trim()
    ? `CURRENT PROJECT CODE:\n${currentProjectCode}\n\nUSER REQUEST:\n${userPrompt}\n\nUpdate or generate complete FlowScript DSL code according to the request:`
    : `USER REQUEST:\n${userPrompt}\n\nGenerate complete FlowScript DSL code:`;

  switch (config.provider) {
    case 'gemini':
      return callGeminiAPI(promptContext, config);
    case 'openai':
      return callOpenAIAPI(promptContext, config);
    case 'claude':
      return callClaudeAPI(promptContext, config);
    case 'custom_local':
      return callCustomLocalAPI(promptContext, config);
    default:
      throw new Error(`Unrecognized LLM provider: ${config.provider}`);
  }
}

/**
 * Call Google Gemini API
 */
async function callGeminiAPI(prompt: string, config: LLMConfig): Promise<string> {
  const apiKey = config.geminiApiKey.trim();
  if (!apiKey) {
    throw new Error('Google Gemini API Key is missing. Please enter your Gemini API Key in the LLM Settings menu.');
  }

  const model = config.geminiModel || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: config.temperature ?? 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to call Gemini API (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini returned an empty text response.');
  }

  return cleanDSLResponse(rawText);
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(prompt: string, config: LLMConfig): Promise<string> {
  const apiKey = config.openaiApiKey.trim();
  if (!apiKey) {
    throw new Error('OpenAI API Key is missing. Please enter your OpenAI API Key in the LLM Settings menu.');
  }

  const baseUrl = (config.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;
  const model = config.openaiModel || 'gpt-4o-mini';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: config.temperature ?? 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to call OpenAI API (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error('OpenAI returned an empty text response.');
  }

  return cleanDSLResponse(rawText);
}

/**
 * Call Claude (Anthropic) API
 */
async function callClaudeAPI(prompt: string, config: LLMConfig): Promise<string> {
  const apiKey = config.claudeApiKey.trim();
  if (!apiKey) {
    throw new Error('Claude API Key is missing. Please enter your Claude API Key in the LLM Settings menu.');
  }

  const url = 'https://api.anthropic.com/v1/messages';
  const model = config.claudeModel || 'claude-3-5-sonnet-20241022';

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
      max_tokens: 4000,
      temperature: config.temperature ?? 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to call Claude API (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.content?.[0]?.text;
  if (!rawText) {
    throw new Error('Claude returned an empty text response.');
  }

  return cleanDSLResponse(rawText);
}

/**
 * Call Custom Local LLM Endpoint (e.g. http://127.0.0.1:8088/completion)
 */
async function callCustomLocalAPI(prompt: string, config: LLMConfig): Promise<string> {
  const endpoint = (config.customEndpoint || 'http://127.0.0.1:8088/completion').trim();
  if (!endpoint) {
    throw new Error('Local LLM endpoint is not specified (e.g., http://127.0.0.1:8088/completion)');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.customApiKey && config.customApiKey.trim()) {
    headers['Authorization'] = `Bearer ${config.customApiKey.trim()}`;
  }

  // Construct payload. If endpoint ends with /completion (llama.cpp server format):
  const fullPrompt = `<|system|>\n${SYSTEM_PROMPT}\n<|user|>\n${prompt}\n<|assistant|>\n`;

  let body: string;
  const isLlamaCompletion = endpoint.endsWith('/completion');
  const isChatCompletions = endpoint.includes('/chat/completions');

  if (isChatCompletions) {
    body = JSON.stringify({
      model: config.customModel || 'local-model',
      temperature: config.temperature ?? 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });
  } else {
    // Default llama.cpp / text completion endpoint format
    body = JSON.stringify({
      prompt: fullPrompt,
      temperature: config.temperature ?? 0.2,
      n_predict: 2048,
      stream: false,
      stop: ['<|end|>', '<|user|>', '</s>'],
    });
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Local LLM Server responded with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    // Support various local endpoint response shapes:
    // llama.cpp: { content: "..." }
    // Ollama: { response: "..." }
    // OpenAI format: { choices: [{ message: { content: "..." } }] }
    // text-gen: { text: "..." } or [{ generated_text: "..." }]
    let rawText = '';
    if (typeof data.content === 'string') {
      rawText = data.content;
    } else if (typeof data.response === 'string') {
      rawText = data.response;
    } else if (typeof data.text === 'string') {
      rawText = data.text;
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
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Cannot reach local server at ${endpoint}.\n` +
        `Make sure your local server is running (e.g. llama-server --port 8088) with CORS enabled (--cors-allow-origin *).`
      );
    }
    throw err;
  }
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

const BOT_ASSISTANT_SYSTEM_PROMPT = `You are FlowBot — a concise AI assistant for flowchart questions.

KEY RULES:
- **NEVER generate or create flowcharts unless explicitly asked** with clear phrases like "create a diagram", "generate flowchart", "make a flow", or "build a process diagram".
- Answer questions briefly and directly in 1-3 short sentences.
- Match user's language (Indonesian → Indonesian, English → English).
- Use bullet points only when listing 3+ items.
- NO greetings, NO "Certainly!", NO repeating the question.

CAPABILITIES:
1. Answer questions about flowchart concepts, best practices, or specific elements
2. Explain existing flowchart logic if shown
3. Give quick suggestions when asked

WHEN TO GENERATE FLOWCHART:
Only if user uses explicit phrases like:
- "create/generate/make/build a flowchart/diagram"
- "show me a flow for..."
- "design a process for..."

If generating, wrap in:
\`\`\`flowscript
[NODES]
<type>: <id> "<label>"
[CONNECTORS]
<fromId> -> <toId>
\`\`\`

EXAMPLE RESPONSES:
User: "What is a decision node?"
You: "A decision node represents a conditional branch with Yes/No paths, shown as a diamond shape."

User: "How do I improve my login flow?"
You: "Add error handling branches and rate limiting checks after authentication attempts."

User: "Create a user registration flowchart"
You: [Generate flowchart with FlowScript DSL]`;


/**
 * Interactive Chat with Flowchart Bot Assistant
 */
export async function chatWithFlowchartBot(
  userMessage: string,
  currentDSL: string,
  history: BotChatMessage[],
  config: LLMConfig
): Promise<{ reply: string; generatedDSL?: string }> {
  const promptContext = `CURRENT CANVAS FLOWCHART CODE:
${currentDSL.trim() || '(Canvas is currently empty)'}

RECENT CHAT HISTORY:
${history.slice(-4).map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')}

USER MESSAGE:
${userMessage}

Please provide your helpful response:`;

  let rawReply = '';
  switch (config.provider) {
    case 'gemini': {
      const apiKey = config.geminiApiKey.trim();
      if (!apiKey) throw new Error('Gemini API Key missing. Please set it in AI Settings.');
      const model = config.geminiModel || 'gemini-2.5-flash';
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${BOT_ASSISTANT_SYSTEM_PROMPT}\n\n${promptContext}` }] }],
          generationConfig: { temperature: 0.4 },
        }),
      });
      if (!res.ok) throw new Error(`Gemini API Error (${res.status}): ${await res.text()}`);
      const data = await res.json();
      rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      break;
    }
    case 'openai': {
      const apiKey = config.openaiApiKey.trim();
      if (!apiKey) throw new Error('OpenAI API Key missing. Please set it in AI Settings.');
      const baseUrl = (config.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: config.openaiModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: BOT_ASSISTANT_SYSTEM_PROMPT },
            { role: 'user', content: promptContext },
          ],
          temperature: 0.4,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI API Error (${res.status}): ${await res.text()}`);
      const data = await res.json();
      rawReply = data?.choices?.[0]?.message?.content || '';
      break;
    }
    case 'claude': {
      const apiKey = config.claudeApiKey.trim();
      if (!apiKey) throw new Error('Claude API Key missing. Please set it in AI Settings.');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.claudeModel || 'claude-3-5-sonnet-20241022',
          max_tokens: 3000,
          system: BOT_ASSISTANT_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: promptContext }],
        }),
      });
      if (!res.ok) throw new Error(`Claude API Error (${res.status}): ${await res.text()}`);
      const data = await res.json();
      rawReply = data?.content?.[0]?.text || '';
      break;
    }
    case 'custom_local':
    default: {
      const endpoint = (config.customEndpoint || 'http://127.0.0.1:8088/completion').trim();
      const isChat = endpoint.includes('/chat/completions');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.customApiKey) headers['Authorization'] = `Bearer ${config.customApiKey.trim()}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: isChat
          ? JSON.stringify({
              model: config.customModel || 'local-model',
              messages: [
                { role: 'system', content: BOT_ASSISTANT_SYSTEM_PROMPT },
                { role: 'user', content: promptContext },
              ],
            })
          : JSON.stringify({
              prompt: `<|system|>\n${BOT_ASSISTANT_SYSTEM_PROMPT}\n<|user|>\n${promptContext}\n<|assistant|>\n`,
              n_predict: 2048,
              stop: ['<|end|>', '<|user|>', '</s>'],
            }),
      });
      if (!res.ok) throw new Error(`Local Server Error (${res.status}): ${await res.text()}`);
      const data = await res.json();
      rawReply = data.content || data.response || data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
      break;
    }
  }

  // Clean raw reply of LLM prompt tokens
  rawReply = rawReply.replace(/<\|[^>]*\|?>/g, '').replace(/<\|+/g, '').replace(/<\/s>/g, '').trim();

  // Check if reply contains DSL code
  let generatedDSL: string | undefined;
  const dslMatch = rawReply.match(/```(?:flowscript|dsl|txt)?\s*([\s\S]*?\[NODES\][\s\S]*?)\s*```/i);
  if (dslMatch) {
    generatedDSL = cleanDSLResponse(dslMatch[1]);
  } else if (rawReply.includes('[NODES]') && rawReply.includes('->')) {
    // LLM didn't fence with backticks but included raw nodes and connectors
    const nodesStartIdx = rawReply.indexOf('[NODES]');
    if (nodesStartIdx !== -1) {
      generatedDSL = cleanDSLResponse(rawReply.substring(nodesStartIdx));
    }
  }

  return {
    reply: rawReply,
    generatedDSL,
  };
}

/**
 * Quick ping test for checking LLM connection status
 */
export async function testLLMConnection(config: LLMConfig): Promise<{ success: boolean; message: string }> {
  try {
    const testResult = await generateFlowchartWithLLM(
      'Create a simple diagram: Start -> Process -> End',
      '',
      config
    );
    if (testResult && testResult.includes('[NODES]')) {
      return { success: true, message: 'Connection successful! Model responded with valid FlowScript DSL format.' };
    }
    return { success: true, message: 'Connection successful, model response received.' };
  } catch (err: any) {
    return { success: false, message: err.message || String(err) };
  }
}
