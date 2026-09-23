import { View, Text, Image, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { colors } from '../theme';

interface AvatarProps {
  size?: number;
  borderWidth?: number;
}

export default function Avatar({ size = 36, borderWidth = 2 }: AvatarProps) {
  const { profile, user } = useAuthStore();
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];

  const avatarUrl = profile?.avatar_url;
  const name = profile?.full_name || user?.email?.split('@')[0] || 'U';
  const initial = name[0]?.toUpperCase() ?? 'U';

  return (
    <View style={[styles.wrap, {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth,
      borderColor: theme.accent,
      backgroundColor: theme.accentDim as string,
      overflow: 'hidden',
    }]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size }]}>
          <Text style={[styles.initial, {
            color: theme.accent,
            fontSize: size * 0.38,
          }]}>
            {initial}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '800' },
});