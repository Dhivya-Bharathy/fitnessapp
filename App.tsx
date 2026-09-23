import { useEffect, useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Platform, LayoutChangeEvent } from 'react-native';
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
  const { setSession, user } = useAuthStore();
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
      style.textContent = "@font-face{font-family:'Ionicons';src:url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');font-weight:normal;font-style:normal}";
      document.head.appendChild(style);
      return () => { clearTimeout(t); document.head.removeChild(style); };
    }
    return () => clearTimeout(t);
  }, []);

  const onWebLayout = useCallback((e: LayoutChangeEvent) => {
    setContentWidth(e.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setTimeout(async () => {
          try {
            const { data } = await supabase.from('profiles')
              .select('last_active_date').eq('id', session.user.id).single();
            if (data) {
              const { checkAndSendStreakReminder } = await import('./src/services/notificationService');
              await checkAndSendStreakReminder(session.user.id, data.last_active_date);
            }
          } catch {}
        }, 3000);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
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
    <SafeAreaProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </SafeAreaProvider>
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
