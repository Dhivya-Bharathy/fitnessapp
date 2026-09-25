import { Alert, Platform } from 'react-native';

export function showUserMessage(title: string, message: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export function showSaveSuccess(message: string): void {
  showUserMessage('Profile saved successfully', message);
}
