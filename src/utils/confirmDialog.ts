import { Alert, Platform } from 'react-native';

/** Works on web (window.confirm) and native (Alert). */
export function confirmDialog(
  title: string,
  message: string,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
