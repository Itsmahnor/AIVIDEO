import {loadFontFromInfo} from '@remotion/google-fonts/from-info';
import {getInfo as getInterInfo} from '@remotion/google-fonts/Inter';
import {getInfo as getMontserratInfo} from '@remotion/google-fonts/Montserrat';
import {getInfo as getPlayfairDisplayInfo} from '@remotion/google-fonts/PlayfairDisplay';
import type {BrandKit} from '@ai-video-studio/schema';
import {continueRender, delayRender} from 'remotion';
import {createContext, type FC, type ReactNode, useContext, useMemo} from 'react';
import {getReadableTextColor, lighten, withOpacity} from './color';
import {motionStyleMap} from './motion';

const systemFontFallback = 'system-ui, sans-serif';
const derivedColorAmount = 0.08;
const mutedOpacity = 0.68;

type FontInfo = Parameters<typeof loadFontFromInfo>[0];
type FontInfoLoader = () => FontInfo;

const googleFontLoaders: Record<string, FontInfoLoader> = {
  Inter: getInterInfo,
  Montserrat: getMontserratInfo,
  'Playfair Display': getPlayfairDisplayInfo,
};

const loadedFontFamilies = new Map<string, string>();

export const loadBrandFont = (fontName: string): string => {
  const cached = loadedFontFamilies.get(fontName);
  if (cached) return cached;

  const getInfo = googleFontLoaders[fontName];
  if (!getInfo) return systemFontFallback;

  const handle = delayRender(`Loading ${fontName}`);
  try {
    const loadedFont = loadFontFromInfo(getInfo());
    loadedFontFamilies.set(fontName, loadedFont.fontFamily);
    loadedFont.waitUntilDone().then(
      () => continueRender(handle),
      () => continueRender(handle),
    );
    return loadedFont.fontFamily;
  } catch {
    continueRender(handle);
    return systemFontFallback;
  }
};

export type BrandTheme = {
  name: string;
  colors: BrandKit['colors'] & {
    surface: string;
    muted: string;
    onPrimary: string;
    onAccent: string;
  };
  fonts: BrandKit['fonts'];
  motion: (typeof motionStyleMap)[BrandKit['motionStyle']];
  logoUrl: string;
};

const BrandThemeContext = createContext<BrandTheme | null>(null);

export const BrandThemeProvider: FC<{brand: BrandKit; children: ReactNode}> = ({brand, children}) => {
  const theme = useMemo<BrandTheme>(
    () => ({
      name: brand.name,
      colors: {
        ...brand.colors,
        surface: lighten(brand.colors.background, derivedColorAmount),
        muted: withOpacity(brand.colors.text, mutedOpacity),
        onPrimary: getReadableTextColor(brand.colors.primary, brand.colors.text),
        onAccent: getReadableTextColor(brand.colors.accent, brand.colors.text),
      },
      fonts: {
        heading: loadBrandFont(brand.fonts.heading),
        body: loadBrandFont(brand.fonts.body),
      },
      motion: motionStyleMap[brand.motionStyle],
      logoUrl: brand.logoUrl,
    }),
    [brand],
  );

  return <BrandThemeContext.Provider value={theme}>{children}</BrandThemeContext.Provider>;
};

export const useBrand = (): BrandTheme => {
  const theme = useContext(BrandThemeContext);
  if (!theme) throw new Error('useBrand must be used inside a BrandThemeProvider');
  return theme;
};
