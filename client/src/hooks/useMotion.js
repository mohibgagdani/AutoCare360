import { useSelector } from 'react-redux';
import { useReducedMotion } from 'framer-motion';

/** True when the OS asks for reduced motion or the user turned it on in Settings. */
export function useReducedMotionPref() {
  const system = useReducedMotion();
  const pref = useSelector((s) => s.ui.reduceMotion);
  return Boolean(pref || system);
}

/**
 * Returns framer-motion `initial` props that are skipped entirely under reduced
 * motion (so content renders in its final state immediately).
 */
export function useEntrance(initial) {
  const reduced = useReducedMotionPref();
  return reduced ? false : initial;
}

const INSTANT_EXIT = { opacity: 0, transition: { duration: 0 } };

/**
 * `initial` / `exit` props for overlays (modals, drawers, menus). Under reduced
 * motion they appear and disappear instantly instead of fading/sliding.
 */
export function useOverlayMotion(initial, exit = initial) {
  const reduced = useReducedMotionPref();
  return reduced ? { initial: false, exit: INSTANT_EXIT } : { initial, exit };
}
