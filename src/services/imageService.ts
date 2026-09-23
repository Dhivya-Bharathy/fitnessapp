import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

/** Opens the device gallery for the user to pick an image. @returns The URI of the selected image, or null if cancelled. */
export const pickImageFromGallery = async (): Promise<string | null> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
};

/** Uploads an avatar image to Supabase Storage for a user. @param imageUri - The local URI of the image to upload. @param userId - The user's ID. @returns The public URL of the uploaded avatar, or null on failure. */
export const uploadAvatarToSupabase = async (
  imageUri: string,
  userId: string
): Promise<string | null> => {
  try {
    // Read file as base64
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const filePath = `${userId}/avatar.jpg`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true, // overwrite if exists
      });

    if (uploadError) {
      if (__DEV__) console.error('Upload error:', uploadError.message);
      return null;
    }

    // Get public URL
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Add cache bust so updated image shows immediately
    return `${data.publicUrl}?t=${Date.now()}`;
  } catch (error) {
    if (__DEV__) console.error('Avatar upload failed:', error);
    return null;
  }
};