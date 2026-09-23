/**
 * Netlify OpenAI Whisper proxy. Set OPENAI_API_KEY in site env.
 */
export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { audioBase64, mimeType = 'audio/m4a' } = await req.json();
    if (!audioBase64) {
      return Response.json({ error: 'audioBase64 required' }, { status: 400 });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), 'audio.m4a');
    form.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data?.error?.message || 'Whisper error' }, { status: response.status });
    }

    return Response.json(
      { transcript: data.text ?? '' },
      { headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (e) {
    return Response.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
};
