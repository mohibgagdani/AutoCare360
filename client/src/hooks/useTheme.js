import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme as setThemeAction } from '@/store/uiSlice';
import { profileApi } from '@/services';
import { useMediaQuery } from './common';

/** Applies the theme class to <html> and follows the OS when set to "system". */
export function useThemeEffect() {
  const theme = useSelector((s) => s.ui.theme);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#070b14' : '#ffffff');
  }, [isDark]);

  return isDark;
}

/** Theme preference with persistence to localStorage and (when signed in) the profile. */
export function useTheme() {
  const dispatch = useDispatch();
  const theme = useSelector((s) => s.ui.theme);
  const signedIn = useSelector((s) => Boolean(s.auth.user));
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  const setTheme = useCallback(
    (value) => {
      dispatch(setThemeAction(value));
      if (signedIn) profileApi.preferences({ theme: value }).catch(() => {});
    },
    [dispatch, signedIn]
  );

  return { theme, resolved, setTheme };
}
