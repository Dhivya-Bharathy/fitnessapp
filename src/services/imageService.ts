import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

export type PickedImage = {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
};

/** Opens the device gallery for the user to pick an image. */
export const pickImageFromGallery = async (): Promise<PickedImage | null> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('Photo access was blocked. Allow photos/files for this site in your browser settings.');
    }
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.72,
    base64: true,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType ?? null,
  };
};

export type AvatarUploadResult = { url: string | null; error?: string };

/** Uploads an avatar to Supabase Storage `avatars/{userId}/avatar.jpg`. */
export async function uploadAvatarToSupabase(
  userId: string,
  picked: PickedImage,
): Promise<AvatarUploadResult> {
  if (!userId) {
    return { url: null, error: 'Sign in to upload a profile photo.' };
  }

  const isPng = picked.mimeType?.includes('png') || picked.uri.toLowerCase().includes('.png');
  const ext = isPng ? 'png' : 'jpg';
  const contentType = isPng ? 'image/png' : 'image/jpeg';
  const filePath = `${userId}/avatar.${ext}`;

  try {
    let body: ArrayBuffer;
    if (picked.base64) {
      body = decode(picked.base64);
    } else {
      const response = await fetch(picked.uri);
      if (!response.ok) {
        return { url: null, error: `Could not read the selected image (${response.status}).` };
      }
      body = await response.arrayBuffer();
    }

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, body, { contentType, upsert: true });

    if (uploadError) {
      let hint = '';
      const m = uploadError.message ?? '';
      if (/bucket|not found/i.test(m)) {
        hint = ' Run supabase/migrations/005_storage_avatars.sql in Supabase → SQL Editor.';
      } else if (/policy|row-level|permission|JWT/i.test(m)) {
        hint = ' Run 005_storage_avatars.sql and stay signed in with Google.';
      }
      if (__DEV__) console.error('[avatar upload]', m);
      return { url: null, error: `${m}${hint}` };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const baseUrl = data.publicUrl.split('?')[0];
    return { url: `${baseUrl}?t=${Date.now()}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    if (__DEV__) console.error('[avatar upload]', e);
    return { url: null, error: msg };
  }
}
