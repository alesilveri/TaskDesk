import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { ThemeState } from '../types';

type ThemePreference = ThemeState['preference'];
type ResolvedTheme = ThemeState['current'];

interface ThemeContextValue {
  theme: ResolvedTheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyThemeToDocument(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
}

const bridge = typeof window !== 'undefined' ? window.api : undefined;

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ResolvedTheme>('light');
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  const syncTheme = useCallback((state: ThemeState) => {
    setTheme(state.current);
    setPreferenceState(state.preference);
    applyThemeToDocument(state.current);
  }, []);

  useEffect(() => {
    if (!bridge?.system) {
      applyThemeToDocument(theme);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const state = await bridge.system.theme();
        if (!cancelled && state) {
          syncTheme(state);
        }
      } catch (err) {
        console.error('Unable to load theme', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bridge, syncTheme, theme]);

  useEffect(() => {
    if (!bridge?.system) {
      return;
    }
    const unsubscribe = bridge.system.onThemeChange((next) => {
      applyThemeToDocument(next);
      setTheme(next);
    });
    return () => {
      unsubscribe?.();
    };
  }, [bridge]);

  const setPreference = useCallback(
    async (next: ThemePreference) => {
      try {
        if (!bridge?.system) {
          syncTheme({ current: theme, preference: next });
          return;
        }
        const state = await bridge.system.setTheme(next);
        if (state) {
          syncTheme(state);
        }
      } catch (err) {
        console.error('Unable to update theme', err);
      }
    },
    [bridge, syncTheme, theme],
  );

  const value = useMemo(
    () => ({
      theme,
      preference,
      setPreference,
    }),
    [theme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return ctx;
}
