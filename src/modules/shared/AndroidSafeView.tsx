import { Platform, StatusBar, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
}

export function AndroidSafeView({ children, style, backgroundColor }: Props) {
  const insets = useSafeAreaInsets();

  const body = (
    <View style={styles.body}>
      {children}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          {
            flex: 1,
            backgroundColor,
            minHeight: '100dvh' as unknown as number,
            maxHeight: '100dvh' as unknown as number,
            paddingTop: 'env(safe-area-inset-top)' as unknown as number,
          },
          style,
        ]}
      >
        {body}
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView style={[{ flex: 1, backgroundColor }, style]}>
        {body}
      </SafeAreaView>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor, paddingTop: insets.top }, style]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {body}
    </View>
  );
}

const styles = {
  body: {
    flex: 1,
    minHeight: 0,
    position: 'relative' as const,
  },
};
