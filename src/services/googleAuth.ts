import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

function getOAuthRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    return `${url.origin}${url.pathname || '/'}`;
  }
  return Linking.createURL('/');
}

/** Parse tokens from Supabase OAuth redirect (native deep link or web hash). */
async function createSessionFromRedirect(url: string): Promise<void> {
  const parsed = Linking.parse(url);
  const qp = parsed.queryParams ?? {};

  if (typeof qp.error_description === 'string') {
    throw new Error(qp.error_description);
  }
  if (typeof qp.error === 'string') {
    throw new Error(qp.error);
  }

  const code = typeof qp.code === 'string' ? qp.code : null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const access_token = typeof qp.access_token === 'string' ? qp.access_token : null;
  const refresh_token = typeof qp.refresh_token === 'string' ? qp.refresh_token : null;
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
  }
}

/**
 * One-tap Google sign-in via Supabase Auth.
 * Configure Google Cloud OAuth + Supabase provider before use.
 */
export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; message: string }> {
  const redirectTo = getOAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
      queryParams: { access_type: 'offline', prompt: 'select_account' },
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (Platform.OS === 'web') {
    if (data.url) {
      window.location.assign(data.url);
    }
    return { ok: true };
  }

  if (!data.url) {
    return { ok: false, message: 'Google sign-in URL was not returned.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    return { ok: false, message: 'Google sign-in was cancelled.' };
  }

  try {
    await createSessionFromRedirect(result.url);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not complete Google sign-in.';
    return { ok: false, message: msg };
  }
}
