/**
 * Smoke test: Supabase connectivity + local Indian food search.
 * Run: node scripts/e2e-smoke.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(join(root, '.env'), 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const tables = [
  'profiles',
  'food_logs',
  'water_logs',
  'workout_sessions',
  'step_logs',
  'sleep_logs',
  'notifications',
  'partners',
  'partner_messages',
  'notes',
];

let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}: ${e.message}`);
  }
}

await check('Supabase URL configured', async () => {
  if (!url?.includes('supabase.co')) throw new Error('missing URL');
});

await check('Anonymous auth', async () => {
  const r = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (r.status !== 200) throw new Error(`${r.status} ${await r.text()}`);
});

for (const t of tables) {
  await check(`Table ${t} reachable`, async () => {
    const r = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (r.status === 404) throw new Error('table missing — run supabase/migrations/000_full_schema.sql');
    if (r.status >= 500) throw new Error(`HTTP ${r.status}`);
  });
}

await check('Indian food database in source', async () => {
  const src = readFileSync(join(root, 'src/services/foodSearchService.ts'), 'utf8');
  if (!src.includes('Chicken Biryani') || !src.includes('INDIAN_FOODS')) {
    throw new Error('Indian food DB missing');
  }
});

await check('AI proxy (optional)', async () => {
  const r = await fetch(`${url}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (r.status === 404) {
    console.log('  (skipped — deploy ai-proxy for AI features)');
    return;
  }
  if (r.status >= 500) throw new Error(`HTTP ${r.status}`);
});

console.log(failed ? `\n${failed} check(s) failed` : '\nAll smoke checks passed');
process.exit(failed ? 1 : 0);
