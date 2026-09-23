import { View, Text, Image } from 'react-native';
import { colors } from '../../theme';

interface Props {
  uri?: string | null;
  name: string;
  size?: number;
  theme: typeof colors.dark;
  hasStory?: boolean;
  seen?: boolean;
  showOnline?: boolean;
}

export function UserAvatar({
  uri,
  name,
  size = 40,
  theme,
  hasStory = false,
  seen = false,
  showOnline = false,
}: Props) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={{
      padding: hasStory ? 2 : 0,
      borderRadius: size / 2 + 3,
      borderWidth: hasStory ? 2 : 0,
      borderColor: hasStory
        ? seen ? theme.border : theme.accent
        : 'transparent',
    }}>
      <View style={{ position: 'relative' }}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
          />
        ) : (
          <View style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.accentDim as string,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{
              color: theme.accent,
              fontWeight: '700',
              fontSize: size * 0.36,
            }}>
              {initials || 'U'}
            </Text>
          </View>
        )}
        {showOnline && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: size * 0.14,
            backgroundColor: theme.accent,
            borderWidth: 2,
            borderColor: theme.bg,
          }} />
        )}
      </View>
    </View>
  );
}