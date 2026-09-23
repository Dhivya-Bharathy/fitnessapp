import { Platform } from 'react-native';

export const OPENAI_CHAT_MODEL =
  process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';

export const OPENAI_VISION_MODEL =
  process.env.EXPO_PUBLIC_OPENAI_VISION_MODEL || OPENAI_CHAT_MODEL;

const PROXY_ENV = process.env.EXPO_PUBLIC_ASSESSMENT_PROXY_URL?.replace(/\/$/, '');

export class OpenAiProxyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAiProxyError';
  }
}

export type OpenAiChatMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

export type ChatCompletionRequest = {
  messages: OpenAiChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
};

export type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

function netlifyOrigin(): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return null;
}

/** Local proxy base URLs (no trailing slash). */
export function openAiProxyBaseUrls(): string[] {
  const list: string[] = [];
  if (PROXY_ENV) list.push(PROXY_ENV);

  if (Platform.OS === 'web') {
    if (__DEV__) list.push('http://localhost:8787');
    const origin = netlifyOrigin();
    if (origin && /netlify\.app|\.netlify\.live/i.test(origin)) {
      list.push(origin);
    }
  }

  return [...new Set(list)];
}

function isLocalProxyBase(base: string): boolean {
  const b = base.replace(/\/$/, '');
  return b.includes('localhost') || /:\d{2,5}$/.test(b);
}

function chatCompletionUrl(base: string): string {
  const b = base.replace(/\/$/, '');
  if (isLocalProxyBase(b)) return `${b}/`;
  return `${b}/.netlify/functions/openai-proxy`;
}

function transcribeUrl(base: string): string {
  const b = base.replace(/\/$/, '');
  if (isLocalProxyBase(b)) return `${b}/transcribe`;
  return `${b}/.netlify/functions/openai-transcribe`;
}

/** Legacy Netlify path used by older builds. */
function legacyAssessmentUrl(base: string): string {
  return `${base.replace(/\/$/, '')}/.netlify/functions/assessment-plan`;
}

async function postJson<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string | { message?: string } };
  if (!res.ok) {
    const err =
      typeof data?.error === 'string'
        ? data.error
        : data?.error?.message ?? `Request failed (${res.status})`;
    throw new OpenAiProxyError(err);
  }
  return data;
}

const PROXY_HELP =
  'Start the local AI proxy: npm run proxy:ai — set EXPO_PUBLIC_ASSESSMENT_PROXY_URL=http://YOUR_PC_IP:8787 on phone. '
  + 'On Netlify, set OPENAI_API_KEY (no Supabase edge functions).';

/**
 * Calls OpenAI chat completions via local/Netlify proxy (key never in the browser bundle).
 */
export async function invokeOpenAiChat(
  request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  const payload: ChatCompletionRequest = {
    model: OPENAI_CHAT_MODEL,
    temperature: 0.7,
    max_tokens: 1500,
    ...request,
  };

  const errors: string[] = [];
  const bases = openAiProxyBaseUrls();

  for (const base of bases) {
    const urls = [chatCompletionUrl(base)];
    if (!isLocalProxyBase(base)) {
      urls.push(legacyAssessmentUrl(base));
    }
    for (const url of urls) {
      try {
        return await postJson<ChatCompletionResponse>(url, payload);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${url}: ${msg}`);
        if (__DEV__) console.warn('[openai-proxy] failed', url, msg);
      }
    }
  }

  throw new OpenAiProxyError(`${PROXY_HELP}${__DEV__ ? ` ${errors.join(' | ')}` : ''}`);
}

export async function invokeOpenAiChatContent(
  request: ChatCompletionRequest,
): Promise<string> {
  const data = await invokeOpenAiChat(request);
  const content = data?.choices?.[0]?.message?.content ?? '';
  if (!content) {
    throw new OpenAiProxyError('Empty response from OpenAI');
  }
  return content;
}

export async function transcribeAudioViaOpenAi(
  audioBase64: string,
  mimeType = 'audio/m4a',
): Promise<string | null> {
  const errors: string[] = [];

  for (const base of openAiProxyBaseUrls()) {
    const url = transcribeUrl(base);
    try {
      const data = await postJson<{ transcript?: string }>(url, {
        audioBase64,
        mimeType,
      });
      const text = data?.transcript?.trim();
      if (text) return text;
    } catch (e) {
      errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (__DEV__) console.warn('[openai-proxy] transcribe failed', errors.join(' | '));
  return null;
}
