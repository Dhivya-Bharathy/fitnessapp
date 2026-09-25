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

export default function App() {
  const { setSession, user, loadProfile } = useAuthStore();
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const [fontTimeout, setFontTimeout] = useState(false);

  const [fontsLoaded, fontsError] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    ...(Platform.OS !== 'web' ? Ionicons.font : {}),
  });

  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 5000);
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = "@font-face{font-family:'Ionicons';src:url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');font-weight:normal;font-style:normal}"
        + "html,body{height:100%;margin:0;overflow:hidden;}"
        + "#root{display:flex;flex-direction:column;flex:1;min-height:100dvh;max-height:100dvh;overflow:hidden;}"
        + "[data-focusable=true]{touch-action:manipulation;}"
        + "textarea,input{-webkit-user-select:text;user-select:text;}"
        + "#welcome-scroll{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;}";
      document.head.appendChild(style);

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

      return () => { clearTimeout(t); document.head.removeChild(style); };
    }
    return () => clearTimeout(t);
  }, []);

  const onWebLayout = useCallback((e: LayoutChangeEvent) => {
    setContentWidth(e.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
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
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          await supabase.auth.signOut({ scope: 'local' });
          setSession(null);
        } else {
          setSession(session);
          await loadProfile(session.user.id);
        }
      } else {
        setSession(null);
      }

      if (mounted) useAuthStore.setState({ authReady: true });

      if (session?.user) {
        setTimeout(async () => {
          try {
            const lastActive = useAuthStore.getState().profile?.last_active_date ?? null;
            const { checkAndSendStreakReminder } = await import('./src/services/notificationService');
            await checkAndSendStreakReminder(session.user.id, lastActive);
          } catch {}
        }, 3000);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: userData, error } = await supabase.auth.getUser();
        if (error || !userData.user) {
          await supabase.auth.signOut({ scope: 'local' });
          setSession(null);
          return;
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

  if (!fontsLoaded && !fontsError && !fontTimeout) {
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
