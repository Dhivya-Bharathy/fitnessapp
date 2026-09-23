/**
 * Netlify serverless proxy for OpenAI (web production when Supabase function isn't used).
 * Set OPENAI_API_KEY in Netlify env vars.
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
    return Response.json({ error: 'OPENAI_API_KEY not configured on Netlify' }, { status: 500 });
  }

  try {
    const { messages, model = 'gpt-4o-mini', temperature = 0.65, max_tokens = 2800 } = await req.json();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens,
        response_format: { type: 'json_object' },
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data?.error?.message || 'OpenAI error' }, { status: response.status });
    }

    return Response.json(data, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return Response.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
};
