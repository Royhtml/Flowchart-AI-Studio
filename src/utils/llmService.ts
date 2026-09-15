import { LLMConfig, LLMProvider, FlowNode, FlowConnector } from '../types';

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

export const BOT_ASSISTANT_SYSTEM_PROMPT = `You are FlowChart AI — a specialized, high-velocity AI assistant designed like Gemini, Claude, and ChatGPT for flowcharting, system architectures, and process logic.

CRITICAL INSTRUCTIONS:
1. EXTREMELY CONCISE & POINT-BASED (JAWAB SINGKAT & SESUAI POIN UTAMA):
   - Always respond directly to the question focusing strictly on MAIN KEY POINTS ONLY (hanya poin-poin utama).
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
Supported types: start_end, process, decision, input_output, database, document, delay, note, cloud, manual_input, internal_storage, display.`;

/**
 * High-speed built-in knowledge responder for common flowchart questions & generation
 * Returns instant (<30ms) concise answers matching Gemini/Claude/ChatGPT style.
 */
function getFastBuiltinResponse(
  userMessage: string,
  currentDSL: string
): { reply: string; generatedDSL?: string } {
  const q = userMessage.toLowerCase().trim();
  const isIndo = !/[a-z]/.test(q) || /(apa|bagaimana|buat|bikin|alur|cara|jelaskan|kapan|kenapa|fungsi|simbol|diagram|konektor)/i.test(q);

  // Check if explicit diagram generation is requested
  const isCreateRequest = /(buat|buatkan|bikin|generate|create|make|build|design|gambarkan)\s+(flowchart|diagram|alur|flow|proses)/i.test(q);

  if (isCreateRequest) {
    if (q.includes('login') || q.includes('masuk') || q.includes('auth')) {
      const dsl = `[NODES]
start_end: n1 "Mulai"
input_output: n2 "Input Username & Password"
decision: n3 "Kredensial Valid?"
process: n4 "Buka Dashboard"
process: n5 "Tampilkan Pesan Error"
start_end: n6 "Selesai"

[CONNECTORS]
n1 -> n2 "Buka Halaman Login"
n2 -> n3 "Kirim Data"
n3 -> n4 "Ya (Valid)"
n3 -> n5 "Tidak (Gagal)"
n5 -> n2 "Coba Lagi"
n4 -> n6 "Selesai Masuk"`;
      return {
        reply: isIndo
          ? `Alur autentikasi login pengguna dengan validasi kredensial:\n• Input data: Pengguna memasukkan username dan password\n• Evaluasi: Sistem memverifikasi kecocokan akun di database\n• Percabangan: Akses dashboard jika valid, atau tampilkan pesan error jika salah`
          : `User authentication workflow with credential verification:\n• Input credentials: User enters username and password\n• Verification: System checks credentials against database\n• Branching: Grants dashboard access if valid, prompts retry on error`,
        generatedDSL: dsl,
      };
    }

    if (q.includes('checkout') || q.includes('belanja') || q.includes('bayar') || q.includes('order') || q.includes('payment')) {
      const dsl = `[NODES]
start_end: n1 "Mulai Checkout"
input_output: n2 "Pilih Metode Pembayaran"
decision: n3 "Saldo / Limit Cukup?"
process: n4 "Proses Transaksi & Invoice"
process: n5 "Kirim Notifikasi Gagal"
database: n6 "Update Stok & Status Order"
start_end: n7 "Selesai"

[CONNECTORS]
n1 -> n2 "Buka Keranjang"
n2 -> n3 "Konfirmasi Bayar"
n3 -> n4 "Ya (Cukup)"
n3 -> n5 "Tidak (Kurang)"
n4 -> n6 "Simpan Transaksi"
n6 -> n7 "Order Berhasil"
n5 -> n2 "Pilih Metode Lain"`;
      return {
        reply: isIndo
          ? `Alur proses checkout dan pembayaran e-commerce:\n• Seleksi pembayaran: Pembeli memilih metode transfer atau e-wallet\n• Pengecekan saldo: Gateway memverifikasi kecukupan dana\n• Penyelesaian: Update stok database dan terbitkan invoice pesanan`
          : `E-commerce checkout and payment process:\n• Payment selection: Buyer chooses payment method or gateway\n• Balance verification: Gateway verifies sufficient funds\n• Order completion: Updates inventory and generates invoice`,
        generatedDSL: dsl,
      };
    }

    if (q.includes('registrasi') || q.includes('daftar') || q.includes('register') || q.includes('signup')) {
      const dsl = `[NODES]
start_end: n1 "Mulai Registrasi"
input_output: n2 "Isi Form Pendaftaran"
decision: n3 "Email Sudah Terdaftar?"
process: n4 "Kirim Kode OTP Verifikasi"
decision: n5 "OTP Sesuai?"
process: n6 "Aktivasi Akun Baru"
start_end: n7 "Selesai"

[CONNECTORS]
n1 -> n2 "Buka Halaman Daftar"
n2 -> n3 "Cek Database"
n3 -> n4 "Tidak (Email Baru)"
n3 -> n2 "Ya (Gunakan Email Lain)"
n4 -> n5 "Input Kode OTP"
n5 -> n6 "Ya (Valid)"
n5 -> n4 "Tidak (Kirim Ulang)"
n6 -> n7 "Akun Aktif"`;
      return {
        reply: isIndo
          ? `Alur registrasi akun baru dengan verifikasi OTP:\n• Formulir pendaftaran: Pengguna mengisi identitas dan email\n• Validasi keunikan: Pengecekan apakah email sudah terdaftar\n• Verifikasi keamanan: Pengiriman dan pencocokan kode OTP sebelum aktivasi`
          : `New user registration workflow with OTP verification:\n• Form submission: User inputs identity details and email\n• Uniqueness check: Verifies if email is already in database\n• Security verification: Sends and validates OTP code before activation`,
        generatedDSL: dsl,
      };
    }

    // Generic diagram generation
    const dsl = `[NODES]
start_end: n1 "Mulai"
process: n2 "Identifikasi Input & Parameter"
decision: n3 "Syarat Terpenuhi?"
process: n4 "Eksekusi Proses Utama"
process: n5 "Penyesuaian Data"
start_end: n6 "Selesai"

[CONNECTORS]
n1 -> n2 "Inisiasi"
n2 -> n3 "Evaluasi"
n3 -> n4 "Ya"
n3 -> n5 "Tidak"
n5 -> n2 "Revisi"
n4 -> n6 "Selesai"`;
    return {
      reply: isIndo
        ? `Alur diagram proses terstruktur:\n• Tahap awal: Inisialisasi dan verifikasi parameter input\n• Evaluasi logika: Pengujian kondisi pemenuhan syarat\n• Eksekusi akhir: Penyelesaian tugas dan pencatatan hasil`
        : `Structured process workflow diagram:\n• Initiation: Prepares and validates input parameters\n• Logic evaluation: Tests conditional requirements\n• Final execution: Completes task and outputs result`,
      generatedDSL: dsl,
    };
  }

  // Informational / Explanatory questions
  if (q.includes('decision') || q.includes('keputusan') || q.includes('belah ketupat') || q.includes('diamond') || q.includes('percabangan')) {
    return {
      reply: isIndo
        ? `Simbol Decision (Belah Ketupat) digunakan untuk percabangan alur logika berdasarkan suatu kondisi:\n• Menguji kondisi bernilai Benar/Salah (Ya/Tidak)\n• Memiliki minimal 2 jalur keluar bercabang\n• Menentukan arah aliran data berikutnya secara dinamis`
        : `The Decision symbol (Diamond) branches workflow logic based on evaluated conditions:\n• Tests conditions with Boolean Yes/No or True/False outcomes\n• Requires at least 2 outgoing connector paths\n• Dynamically routes flow based on verification results`,
    };
  }

  if (q.includes('terminator') || q.includes('start') || q.includes('end') || q.includes('mulai') || q.includes('selesai') || q.includes('oval')) {
    return {
      reply: isIndo
        ? `Simbol Terminator (Oval/Kapsul) menandai titik awal dan penutup suatu flowchart:\n• Start: Menandai gerbang masuk eksekusi (hanya memiliki garis keluar)\n• End: Menandai akhir proses atau titik terminasi (hanya memiliki garis masuk)\n• Memastikan alur proses memiliki batas lingkup yang jelas dan terhingga`
        : `The Terminator symbol (Oval/Pill) defines the boundary start and end points of a flowchart:\n• Start: Marks the entry point with only outgoing flow\n• End: Marks the termination state with only incoming flow\n• Ensures the process has clearly defined, finite boundaries`,
    };
  }

  if (q.includes('process') || q.includes('proses') || q.includes('kotak') || q.includes('persegi')) {
    return {
      reply: isIndo
        ? `Simbol Process (Persegi Panjang) merepresentasikan eksekusi aksi atau perhitungan sistem:\n• Melakukan kalkulasi matematis atau transformasi data\n• Menjalankan operasi internal tanpa interaksi manual pengguna\n• Memiliki relasi 1 garis masuk dan 1 garis keluar langsung`
        : `The Process symbol (Rectangle) represents an automated operational or calculation step:\n• Executes mathematical calculations or data transformation\n• Performs internal system actions without manual input\n• Typically connects with 1 incoming and 1 outgoing flow line`,
    };
  }

  if (q.includes('database') || q.includes('data') || q.includes('penyimpanan') || q.includes('storage') || q.includes('silinder')) {
    return {
      reply: isIndo
        ? `Simbol Database (Silinder) merepresentasikan penyimpanan data terstruktur:\n• Menyimpan catatan transaksi dan identitas entitas sistem\n• Mendukung operasi pembacaan (Query/Read) dan penulisan (Write/Update)\n• Berfungsi sebagai sumber kebenaran data persisten antar proses`
        : `The Database symbol (Cylinder) represents structured data storage:\n• Persists system records, transactions, and entity states\n• Supports both Read/Query and Write/Update operations\n• Acts as the persistent single source of truth across steps`,
    };
  }

  if (q.includes('input') || q.includes('output') || q.includes('jajar genjang') || q.includes('io')) {
    return {
      reply: isIndo
        ? `Simbol Data / I-O (Jajar Genjang) digunakan untuk transfer informasi masuk dan keluar:\n• Input: Menerima data dari pengguna atau sensor luar\n• Output: Menampilkan hasil laporan atau respon kepada pengguna\n• Memisahkan interaksi eksternal dari komputasi internal proses`
        : `The Data / I-O symbol (Parallelogram) represents data transfer into or out of the system:\n• Input: Captures user input or external sensor feeds\n• Output: Displays reports, messages, or exported results\n• Distinguishes external interaction from internal computation`,
    };
  }

  if (q.includes('aturan') || q.includes('prinsip') || q.includes('best practice') || q.includes('cara membuat')) {
    return {
      reply: isIndo
        ? `Prinsip utama standar perancangan flowchart profesional:\n• Arah konsisten: Alur mengalir teratur dari atas ke bawah atau kiri ke kanan\n• Keterbacaan label: Teks ringkas dengan kata kerja aktif pada setiap node\n• Integritas alur: Seluruh jalur cabang harus berakhir di titik Terminator yang valid`
        : `Core principles for professional flowchart design:\n• Consistent direction: Flows logically from top-to-bottom or left-to-right\n• Crisp labeling: Use short, active verb phrases for each step\n• Path integrity: All conditional branches must terminate at valid endpoints`,
    };
  }

  // General fallback query response
  return {
    reply: isIndo
      ? `Poin utama mengenai perancangan dan logika flowchart:\n• Identifikasi tujuan: Tentukan batasan awal (Start) dan hasil akhir (End) proses\n• Petakan langkah: Gunakan simbol standar (Proses, Keputusan, Data) secara konsisten\n• Uji skenario: Pastikan seluruh kondisi Ya/Tidak memiliki jalur penanganan yang tuntas`
      : `Core points regarding flowchart logic and architecture:\n• Define scope: Establish clear Start and End boundaries for the workflow\n• Standardize symbols: Consistently apply Process, Decision, and Data nodes\n• Validate branching: Ensure every conditional path leads to a resolved outcome`,
  };
}

/**
 * Interactive Chat with Flowchart Bot Assistant (Claude / Gemini / ChatGPT style)
 * Fast, concise, point-based responses.
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

Respond concisely following the main points only:`;

  let rawReply = '';

  try {
    switch (config.provider) {
      case 'gemini': {
        const apiKey = config.geminiApiKey.trim();
        if (!apiKey) {
          return getFastBuiltinResponse(userMessage, currentDSL);
        }
        const model = config.geminiModel || 'gemini-2.5-flash';
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${BOT_ASSISTANT_SYSTEM_PROMPT}\n\n${promptContext}` }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 800,
            },
          }),
        });
        if (!res.ok) throw new Error(`Gemini API Error (${res.status})`);
        const data = await res.json();
        rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        break;
      }

      case 'openai': {
        const apiKey = config.openaiApiKey.trim();
        if (!apiKey) {
          return getFastBuiltinResponse(userMessage, currentDSL);
        }
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
            temperature: 0.2,
            max_tokens: 800,
          }),
        });
        if (!res.ok) throw new Error(`OpenAI API Error (${res.status})`);
        const data = await res.json();
        rawReply = data?.choices?.[0]?.message?.content || '';
        break;
      }

      case 'claude': {
        const apiKey = config.claudeApiKey.trim();
        if (!apiKey) {
          return getFastBuiltinResponse(userMessage, currentDSL);
        }
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
            max_tokens: 800,
            system: BOT_ASSISTANT_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: promptContext }],
          }),
        });
        if (!res.ok) throw new Error(`Claude API Error (${res.status})`);
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            signal: controller.signal,
            body: isChat
              ? JSON.stringify({
                  model: config.customModel || 'local-model',
                  messages: [
                    { role: 'system', content: BOT_ASSISTANT_SYSTEM_PROMPT },
                    { role: 'user', content: promptContext },
                  ],
                  max_tokens: 800,
                  temperature: 0.2,
                })
              : JSON.stringify({
                  prompt: `<|system|>\n${BOT_ASSISTANT_SYSTEM_PROMPT}\n<|user|>\n${promptContext}\n<|assistant|>\n`,
                  n_predict: 800,
                  stop: ['<|end|>', '<|user|>', '</s>'],
                }),
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            rawReply = data.content || data.response || data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
          } else {
            return getFastBuiltinResponse(userMessage, currentDSL);
          }
        } catch {
          clearTimeout(timeoutId);
          return getFastBuiltinResponse(userMessage, currentDSL);
        }
        break;
      }
    }
  } catch (err) {
    console.warn('External LLM error, using fast knowledge fallback:', err);
    return getFastBuiltinResponse(userMessage, currentDSL);
  }

  // Clean raw reply of LLM prompt tokens
  rawReply = (rawReply || '').replace(/<\|[^>]*\|?>/g, '').replace(/<\|+/g, '').replace(/<\/s>/g, '').trim();

  if (!rawReply) {
    return getFastBuiltinResponse(userMessage, currentDSL);
  }

  // Extract DSL code if present
  let generatedDSL: string | undefined;
  const dslMatch = rawReply.match(/```(?:flowscript|dsl|txt)?\s*([\s\S]*?\[NODES\][\s\S]*?)\s*```/i);
  if (dslMatch) {
    generatedDSL = cleanDSLResponse(dslMatch[1]);
    rawReply = rawReply.replace(/```(?:flowscript|dsl|txt)?\s*([\s\S]*?\[NODES\][\s\S]*?)\s*```/i, '').trim();
  } else if (rawReply.includes('[NODES]') && rawReply.includes('->')) {
    const nodesStartIdx = rawReply.indexOf('[NODES]');
    if (nodesStartIdx !== -1) {
      generatedDSL = cleanDSLResponse(rawReply.substring(nodesStartIdx));
      rawReply = rawReply.substring(0, nodesStartIdx).trim();
    }
  }

  if (!rawReply && generatedDSL) {
    rawReply = 'Flowchart berhasil dibuat sesuai permintaan Anda:';
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

    if (currentConfig.provider === 'gemini' && hasGeminiKey) {
      const apiKey = currentConfig.geminiApiKey.trim();
      const model = currentConfig.geminiModel || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${promptWithContext}` }],
            },
          ],
          generationConfig: { temperature: 0.3 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } else if (currentConfig.provider === 'openai' && hasOpenAIKey) {
      const baseUrl = (currentConfig.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentConfig.openaiApiKey.trim()}`,
        },
        body: JSON.stringify({
          model: currentConfig.openaiModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: promptWithContext },
          ],
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } else if (currentConfig.provider === 'custom_local' && hasLocal) {
      const endpoint = currentConfig.customEndpoint.trim();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `<|system|>\n${systemPrompt}\n<|user|>\n${promptWithContext}\n<|assistant|>\n`,
          temperature: 0.3,
          n_predict: 1500,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content || data.response || data.text;
        if (text) return text;
      }
    }
  } catch (err) {
    console.warn('Detail AI external call failed, fallback to built-in:', err);
  }

  // Fallback to high-quality built-in analyzer
  return getBuiltinDetailAIAnalysis(userQuery, context);
}

