import { Dimensions, PixelRatio, Platform } from 'react-native';

let contentWidth = Math.min(Dimensions.get('window').width, 480);

export const setContentWidth = (w: number) => {
  contentWidth = w;
};

export const useContentWidth = () => contentWidth;

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export const scale = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel((contentWidth / BASE_WIDTH) * size));

export const scaleVert = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel((Math.min(Dimensions.get('window').height, 900) / BASE_HEIGHT) * size));

export const moderateScale = (size: number, factor = 0.5): number =>
  Math.round(size + (scale(size) - size) * factor);

const W = Dimensions.get('window').width;
const H = Dimensions.get('window').height;

export const screen = {
  width: W,
  height: H,
  contentWidth,
  isSmallDevice: W < 375,
  isTablet: W >= 768,
  isWeb: Platform.OS === 'web',
};
