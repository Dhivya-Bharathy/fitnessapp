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

  if (Platform.OS === 'web') {
    return (
      <View style={[{ flex: 1, backgroundColor, overflow: 'hidden' }, style]}>
        {children}
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView
        style={[{ flex: 1, backgroundColor }, style]}
      >
        {children}
      </SafeAreaView>
    );
  }

  return (
    <View style={[{
      flex: 1,
      backgroundColor,
      paddingTop: insets.top,
    }, style]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      {children}
    </View>
  );
}
