import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS, status: 204 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not set in Supabase Edge Function secrets' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  }

  try {
    const { messages, model = 'gpt-4o-mini', temperature = 0.65, max_tokens = 2800 } = await req.json();

    if (!Array.isArray(messages) || messages.length < 2) {
      return new Response(JSON.stringify({ error: 'Invalid messages payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
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
      console.error('[assessment-plan] OpenAI error:', JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: data?.error?.message || response.statusText }),
        { status: response.status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      status: 200,
    });
  } catch (err) {
    console.error('[assessment-plan]', err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
