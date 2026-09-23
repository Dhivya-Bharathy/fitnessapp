/**
 * Local OpenAI proxy — no Supabase Edge Functions.
 * Reads OPENAI_API_KEY from .env (never bundled in the app).
 *
 * npm run proxy:ai
 * EXPO_PUBLIC_ASSESSMENT_PROXY_URL=http://YOUR_PC_IP:8787
 */
import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const envText = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const OPENAI_API_KEY = env.OPENAI_API_KEY || env.EXPO_PUBLIC_OPENAI_API_KEY;
const PORT = Number(env.ASSESSMENT_PROXY_PORT || 8787);

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env');
  process.exit(1);
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function forwardChat(payload) {
  const {
    messages,
    model = 'gpt-4o-mini',
    temperature = 0.65,
    max_tokens = 2800,
    response_format,
  } = payload;

  const body = {
    model,
    temperature,
    max_tokens,
    messages,
  };
  if (response_format) body.response_format = response_format;

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  return { status: upstream.status, text };
}

async function forwardTranscribe(payload) {
  const { audioBase64, mimeType = 'audio/m4a' } = payload;
  if (!audioBase64) {
    return { status: 400, text: JSON.stringify({ error: 'audioBase64 required' }) };
  }

  const buffer = Buffer.from(audioBase64, 'base64');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), 'audio.m4a');
  form.append('model', 'whisper-1');

  const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return { status: upstream.status, text };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: 500, text: JSON.stringify({ error: 'Invalid Whisper response' }) };
  }

  return {
    status: 200,
    text: JSON.stringify({ transcript: parsed.text ?? '' }),
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'text/plain', ...cors });
    res.end('POST / or /transcribe');
    return;
  }

  const path = req.url?.split('?')[0] ?? '/';

  try {
    const payload = JSON.parse(await readBody(req));
    const result =
      path === '/transcribe'
        ? await forwardTranscribe(payload)
        : path === '/'
          ? await forwardChat(payload)
          : { status: 404, text: 'Not found' };

    res.writeHead(result.status, { 'Content-Type': 'application/json', ...cors });
    res.end(result.text);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ error: String(e?.message ?? e) }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenAI proxy on http://0.0.0.0:${PORT} (POST / and POST /transcribe)`);
  console.log('Set EXPO_PUBLIC_ASSESSMENT_PROXY_URL=http://YOUR_PC_IP:' + PORT);
});
