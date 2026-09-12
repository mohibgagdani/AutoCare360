import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import { router } from '@/router';
import { bootstrapSession } from '@/store/authSlice';
import { setTheme } from '@/store/uiSlice';
import { useThemeEffect } from '@/hooks/useTheme';
import { useReducedMotionPref } from '@/hooks/useMotion';
import { ConfirmProvider } from '@/components/ui';
import { setCurrency } from '@/utils/format';

export default function App() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const reduceMotion = useReducedMotionPref();
  const isDark = useThemeEffect();

  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);

  // Apply the signed-in user's saved preferences.
  useEffect(() => {
    if (!user?.preferences) return;
    setCurrency(user.preferences.currency);
    if (user.preferences.theme) dispatch(setTheme(user.preferences.theme));
  }, [user?._id, user?.preferences?.currency, user?.preferences?.theme, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <ConfirmProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          gutter={10}
          containerStyle={{ top: 76 }}
          toastOptions={{
            duration: 3800,
            style: {
              background: isDark ? '#121b30' : '#ffffff',
              color: isDark ? '#eef2f8' : '#0b1220',
              border: `1px solid ${isDark ? '#1c2740' : '#e6e9f0'}`,
              borderRadius: '14px',
              boxShadow: '0 10px 38px -10px rgb(15 23 42 / 0.35)',
              fontSize: '14px',
              padding: '10px 14px',
            },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            error: { iconTheme: { primary: '#dc2626', secondary: '#fff' }, duration: 5000 },
          }}
        />
      </ConfirmProvider>
    </MotionConfig>
  );
}
