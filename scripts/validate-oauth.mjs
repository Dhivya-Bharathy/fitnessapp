/**
 * Validates Supabase Google OAuth URL wiring (no user login required).
 * Run: node scripts/validate-oauth.mjs [redirectTo]
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const path = resolve(root, '.env');
  if (!existsSync(path)) {
    console.error('Missing .env');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const redirectTo = process.argv[2] || 'http://localhost:8086/';

if (!url || !anon) {
  console.error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY required');
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: false },
});

const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo, skipBrowserRedirect: true },
});

if (error) {
  console.error('signInWithOAuth failed:', error.message);
  process.exit(1);
}

const authUrl = data?.url;
if (!authUrl) {
  console.error('No OAuth URL returned — is Google provider enabled in Supabase?');
  process.exit(1);
}

const parsed = new URL(authUrl);
const params = parsed.searchParams;
const provider = params.get('provider') || (parsed.pathname.includes('google') ? 'google' : '?');

console.log('OK: OAuth authorize URL generated');
console.log('  Supabase project:', url.replace(/https:\/\//, '').split('.')[0]);
console.log('  redirect_to:', params.get('redirect_to') || '(in path)');
console.log('  provider:', provider);

const fullRedirect = params.get('redirect_to');
if (fullRedirect !== redirectTo && fullRedirect !== redirectTo.replace(/\/$/, '')) {
  console.warn('WARN: redirect_to differs from requested:', fullRedirect, 'vs', redirectTo);
}

const googlePart = authUrl.includes('client_id=') ? new URL(authUrl.split('?')[0] + '?' + authUrl.split('provider=google')[1]?.split('&').slice(0, 5).join('&')) : null;

// Follow redirect chain hint: parse nested authorize URL if present
const nested = params.get('redirect_to');
console.log('\nNext: open this URL in a browser (manual Google login):');
console.log(authUrl.slice(0, 120) + '...\n');
console.log('After login, Supabase Auth Logs should show success or oauth2 invalid_client.');
