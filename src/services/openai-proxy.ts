import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const OPENAI_CHAT_MODEL =
  process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';

export const OPENAI_VISION_MODEL =
  process.env.EXPO_PUBLIC_OPENAI_VISION_MODEL || OPENAI_CHAT_MODEL;

const PROXY_ENV = process.env.EXPO_PUBLIC_ASSESSMENT_PROXY_URL?.replace(/\/$/, '');
const PROXY_PORT = process.env.EXPO_PUBLIC_ASSESSMENT_PROXY_PORT || '8787';

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

/** Same LAN IP as Metro / Expo web — phone can reach proxy without editing .env. */
function devProxyFromBundlerHost(): string | null {
  if (!__DEV__) return null;

  let host: string | null = null;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    host = window.location.hostname;
  }

  const hostUri =
    Constants.expoConfig?.hostUri
    ?? (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra?.expoClient?.hostUri
    ?? (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    host = hostUri.split(':')[0];
  }

  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return `http://localhost:${PROXY_PORT}`;
  }

  return `http://${host}:${PROXY_PORT}`;
}

/** Local proxy base URLs (no trailing slash). */
export function openAiProxyBaseUrls(): string[] {
  const list: string[] = [];
  if (PROXY_ENV) list.push(PROXY_ENV);

  const fromBundler = devProxyFromBundlerHost();
  if (fromBundler) list.push(fromBundler);

  if (Platform.OS === 'web') {
    if (__DEV__) list.push(`http://localhost:${PROXY_PORT}`);
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
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new OpenAiProxyError(
      msg.includes('Network') || msg.includes('Failed to fetch')
        ? `Cannot reach ${url} — is npm run proxy:ai running on your PC?`
        : msg,
    );
  }
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
  'Start the local AI proxy on your PC: npm run proxy:ai (port 8787). '
  + 'Phone and PC must be on the same Wi‑Fi. On Netlify production, set OPENAI_API_KEY in site env (uses /.netlify/functions/openai-proxy — not Supabase).';

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

  const tried = bases.length ? bases.join(', ') : 'none';
  throw new OpenAiProxyError(
    `${PROXY_HELP}${__DEV__ ? ` Tried: ${tried}. ${errors.join(' | ')}` : ''}`,
  );
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
