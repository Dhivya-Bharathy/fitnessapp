import { create } from 'zustand';
import { ColorScheme } from '../theme/colors';

/** Light/dark theme state managed by the theme store. */
interface ThemeState {
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setTheme: (scheme: ColorScheme) => void;
}

/**
 * Zustand store hook for toggling and setting the app color scheme (light/dark).
 *
 * @returns ThemeState — The full store including the current colorScheme
 * and the toggleTheme / setTheme action methods.
 */
export const useThemeStore = create<ThemeState>((set) => ({
  colorScheme: 'light',
  toggleTheme: () =>
    set((state) => ({
      colorScheme: state.colorScheme === 'dark' ? 'light' : 'dark',
    })),
  setTheme: (scheme) => set({ colorScheme: scheme }),
}));