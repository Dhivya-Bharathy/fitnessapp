import { ScrollView, ScrollViewProps } from 'react-native';
import { useMobileScrollProps } from '../hooks/useMobileScrollProps';

/** ScrollView with flex + nested scroll props so lists scroll on iOS/Android and mobile web. */
export function ScreenScrollView({ style, ...rest }: ScrollViewProps) {
  const { scrollViewStyle, scrollProps } = useMobileScrollProps();
  return <ScrollView style={[scrollViewStyle, style]} {...scrollProps} {...rest} />;
}
