'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * ThemeColorProvider - Dynamically updates the browser theme-color meta tag.
 * 
 * This makes the browser's address bar / status bar match the app's theme,
 * creating a more immersive, native-like experience.
 * 
 * CBDS Note: Uses CSS variables via computed styles, not HEX codes.
 */
export function ThemeColorProvider() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Get the actual CSS variable value from the document
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    // Get the background HSL value
    const bgHsl = computedStyle.getPropertyValue('--background').trim();
    
    // Convert HSL to a format browsers understand
    // The variable is typically "0 0% 4%" (dark) or similar
    const themeColor = bgHsl ? `hsl(${bgHsl})` : (resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff');
    
    // Find or create the theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.setAttribute('content', themeColor);
  }, [resolvedTheme]);

  return null; // This component only manages the meta tag, no UI
}
