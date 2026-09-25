import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import App from '../App';
import { colors } from './theme';
import { useThemeStore } from './store/themeStore';

/**
 * Web: finish ?code= PKCE exchange before mounting App (avoids Welcome flash + race).
 */
export default function AppBootstrap() {
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const needsOAuth =
    Platform.OS === 'web'
    && typeof window !== 'undefined'
    && (
      window.location.search.includes('code=')
      || window.location.search.includes('error=')
      || window.location.hash.includes('access_token=')
    );

  const [oauthReady, setOauthReady] = useState(!needsOAuth);

  useEffect(() => {
    if (!needsOAuth) return;
    let cancelled = false;
    (async () => {
      const { completeOAuthRedirectIfNeeded } = await import('./utils/completeOAuthRedirect');
      await completeOAuthRedirectIfNeeded();
      if (!cancelled) setOauthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [needsOAuth]);

  if (!oauthReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return <App />;
}
