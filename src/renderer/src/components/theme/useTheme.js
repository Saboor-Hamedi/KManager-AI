import { useState, useEffect, useCallback } from 'react';
import { THEMES } from './themeDefinitions';
import { getSetting, saveSetting } from '../../lib/settings';

export const applyThemeColors = (themeId) => {
  const theme = THEMES[themeId] || THEMES['dark'];
  if (!theme) return;
  
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};

export const useTheme = () => {
  const [theme, setThemeState] = useState('dark');
  
  // Load initial theme
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await getSetting('APP_THEME', 'dark');
      if (THEMES[savedTheme]) {
        setThemeState(savedTheme);
        applyThemeColors(savedTheme);
      }
    };
    loadTheme();
  }, []);

  const setTheme = useCallback(async (themeId) => {
    if (THEMES[themeId]) {
      setThemeState(themeId);
      applyThemeColors(themeId);
      await saveSetting('APP_THEME', themeId);
    }
  }, []);

  return {
    theme,
    setTheme,
    allThemes: Object.values(THEMES),
    currentThemeConfig: THEMES[theme] || THEMES['dark']
  };
};
