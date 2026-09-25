import { useEffect, useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Platform, LayoutChangeEvent } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/services/supabase';
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';
import { colors } from './src/theme';
import { setContentWidth } from './src/theme/responsive';
import AppNavigator from './src/navigation/AppNavigator';
import { setupNotificationHandler } from './src/services/reminderService';

if (Platform.OS !== 'web') setupNotificationHandler();

const AUTH_BOOT_TIMEOUT_MS = 12_000;
const WEB_FONT_GATE_MS = 800;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export default function App() {
  const { setSession, loadProfile } = useAuthStore();
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const [fontTimeout, setFontTimeout] = useState(Platform.OS === 'web');

  const [fontsLoaded, fontsError] = useFonts(
    Platform.OS === 'web'
      ? {}
      : {
          PlusJakartaSans_400Regular,
          PlusJakartaSans_500Medium,
          PlusJakartaSans_600SemiBold,
          PlusJakartaSans_700Bold,
          PlusJakartaSans_800ExtraBold,
          ...Ionicons.font,
        },
  );

  useEffect(() => {
    const t = setTimeout(
      () => setFontTimeout(true),
      Platform.OS === 'web' ? WEB_FONT_GATE_MS : 5000,
    );
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent =
        "@font-face{font-family:'Ionicons';src:url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');font-weight:normal;font-style:normal}"
        + "html,body{height:100%;margin:0;overflow:hidden;font-family:'Plus Jakarta Sans',system-ui,sans-serif;}"
        + "#root{display:flex;flex-direction:column;flex:1;min-height:100dvh;max-height:100dvh;overflow:hidden;}"
        + "[data-focusable=true]{touch-action:manipulation;}"
        + "textarea,input{-webkit-user-select:text;user-select:text;}"
        + "#welcome-scroll{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;}";
      document.head.appendChild(style);

      const gf = document.createElement('link');
      gf.rel = 'stylesheet';
      gf.href =
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(gf);

      const upsertLink = (rel: string, href: string, type?: string) => {
        let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement('link');
          link.rel = rel;
          document.head.appendChild(link);
        }
        link.href = href;
        if (type) link.type = type;
        else link.removeAttribute('type');
      };
      upsertLink('icon', '/favicon.svg', 'image/svg+xml');
      upsertLink('alternate icon', '/favicon.png', 'image/png');

      return () => {
        clearTimeout(t);
        document.head.removeChild(style);
        document.head.removeChild(gf);
      };
    }
    return () => clearTimeout(t);
  }, []);

  const onWebLayout = useCallback((e: LayoutChangeEvent) => {
    setContentWidth(e.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      const alreadyReady = useAuthStore.getState().authReady;
      if (!alreadyReady) {
        useAuthStore.setState({ authReady: false });
      }

      if (Platform.OS === 'web') {
        const { completeOAuthRedirectIfNeeded } = await import('./src/utils/completeOAuthRedirect');
        await completeOAuthRedirectIfNeeded();
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        try {
          const { data: userData, error: userError } = await withTimeout(
            supabase.auth.getUser(),
            8000,
            'getUser',
          );
          if (userError || !userData.user) {
            await supabase.auth.signOut({ scope: 'local' });
            setSession(null);
          } else {
            setSession(session);
            loadProfile(session.user.id).catch((e) => {
              if (__DEV__) console.warn('[App] loadProfile:', e);
            });
          }
        } catch (e) {
          if (__DEV__) console.warn('[App] auth validation skipped:', e);
          setSession(session);
          loadProfile(session.user.id).catch(() => {});
        }
      } else {
        setSession(null);
      }

      if (session?.user) {
        setTimeout(async () => {
          try {
            const lastActive = useAuthStore.getState().profile?.last_active_date ?? null;
            const { checkAndSendStreakReminder } = await import('./src/services/notificationService');
            await checkAndSendStreakReminder(session.user.id, lastActive);
          } catch { /* optional */ }
        }, 3000);
      }
    };

    (async () => {
      try {
        await withTimeout(bootstrapAuth(), AUTH_BOOT_TIMEOUT_MS, 'auth bootstrap');
      } catch (e) {
        if (__DEV__) console.warn('[App] auth bootstrap:', e);
      } finally {
        if (mounted) useAuthStore.setState({ authReady: true });
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const { data: userData, error } = await supabase.auth.getUser();
          if (error || !userData.user) {
            await supabase.auth.signOut({ scope: 'local' });
            setSession(null);
            return;
          }
        } catch {
          /* keep session on transient network errors */
        }
      }
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id).catch(() => {});
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (Platform.OS === 'web' && fontsError) {
    console.warn('Font loading error on web, continuing with default fonts:', fontsError);
  }

  const fontsReady =
    Platform.OS === 'web' || fontsLoaded || !!fontsError || fontTimeout;

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  const app = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', backgroundColor: theme.bg }}>
        <View onLayout={onWebLayout} style={{ flex: 1, width: '100%', maxWidth: 480 }}>
          {app}
        </View>
      </View>
    );
  }

  return app;
}
