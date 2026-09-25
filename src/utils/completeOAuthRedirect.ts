import { Platform } from 'react-native';
import { supabase } from '../services/supabase';

export const OAUTH_ERROR_STORAGE_KEY = 'fitness_last_oauth_error';

function cleanOAuthUrl(): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, window.location.pathname);
}

function persistOAuthError(message: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(OAUTH_ERROR_STORAGE_KEY, message);
}

export function consumeOAuthError(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const msg = sessionStorage.getItem(OAUTH_ERROR_STORAGE_KEY);
  if (msg) sessionStorage.removeItem(OAUTH_ERROR_STORAGE_KEY);
  return msg;
}

/** Server-side Google token exchange failed inside Supabase (wrong Client secret / Client ID pair). */
function formatSupabaseGoogleError(raw: string): string {
  if (!raw.includes('Unable to exchange external code')) {
    return raw;
  }
  return (
    'Google sign-in failed inside Supabase (not in the Fitness app). '
    + 'Supabase could not swap Google’s code for tokens — almost always wrong Client Secret or Client ID in '
    + 'Supabase → Authentication → Providers → Google.\n\n'
    + 'Fix: Google Cloud → Credentials → open **Web client 2** (871712770967-7vnh…i2kuojlj8) → '
    + 'Add secret → copy once → paste into Supabase Google provider → Save. '
    + 'Use the secret from the **same** client as the Client ID (not Web client 1).'
  );
}

let exchangeInFlight: Promise<boolean> | null = null;

/** After Google OAuth, Supabase redirects with ?code= (PKCE) or ?error_description= */
export async function completeOAuthRedirectIfNeeded(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;

  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  const hash = window.location.hash;

  const hasOAuthCallback =
    !!code
    || hash.includes('access_token=')
    || searchParams.has('error')
    || searchParams.has('error_description');

  if (!hasOAuthCallback) return false;
  if (exchangeInFlight) return exchangeInFlight;

  exchangeInFlight = (async () => {
    try {
      const urlError =
        searchParams.get('error_description')
        ?? searchParams.get('error')
        ?? searchParams.get('error_code');

      if (urlError) {
        const friendly = formatSupabaseGoogleError(decodeURIComponent(urlError.replace(/\+/g, ' ')));
        persistOAuthError(friendly);
        if (__DEV__) console.error('[OAuth]', friendly);
        cleanOAuthUrl();
        return false;
      }

      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) {
        cleanOAuthUrl();
        return true;
      }

      if (hash.includes('access_token=')) {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          cleanOAuthUrl();
          if (error) persistOAuthError(error.message);
          return !error;
        }
      }

      if (code) {
        if (code.includes('/')) {
          const msg =
            'Invalid OAuth redirect: a Google code reached the app URL. '
            + 'Google Authorized redirect URI must be only '
            + 'https://umermqsrosilgjrfmvff.supabase.co/auth/v1/callback';
          persistOAuthError(msg);
          if (__DEV__) console.error('[OAuth]', msg);
          cleanOAuthUrl();
          return false;
        }

        const dedupeKey = `fitness_oauth_code_${code.slice(0, 32)}`;
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(dedupeKey) === 'ok') {
          const { data: { session } } = await supabase.auth.getSession();
          cleanOAuthUrl();
          return !!session;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          const { data: { session } } = await supabase.auth.getSession();
          cleanOAuthUrl();
          if (session) {
            if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(dedupeKey, 'ok');
            return true;
          }
          const friendly = formatSupabaseGoogleError(error.message);
          persistOAuthError(friendly);
          if (__DEV__) console.error('[OAuth]', friendly);
          return false;
        }

        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(dedupeKey, 'ok');
        cleanOAuthUrl();
        return true;
      }

      cleanOAuthUrl();
      return false;
    } finally {
      exchangeInFlight = null;
    }
  })();

  return exchangeInFlight;
}

export function isGoogleSignedInUser(user: { is_anonymous?: boolean; app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  if (user.is_anonymous) return false;
  const provider = user.app_metadata?.provider;
  if (provider === 'google') return true;
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes('google');
}
