/**
 * Tiny pub/sub for cross-component data invalidation.
 * After a mutation call `emitChange('maintenance')`; any `useFetch` subscribed
 * to that topic refetches. Topics: vehicles, maintenance, services, expenses,
 * reminders, documents, notifications, catalog.
 */
const listeners = new Map();

export function onChange(topics, handler) {
  const list = Array.isArray(topics) ? topics : [topics];
  list.forEach((t) => {
    if (!listeners.has(t)) listeners.set(t, new Set());
    listeners.get(t).add(handler);
  });
  return () => list.forEach((t) => listeners.get(t)?.delete(handler));
}

export function emitChange(...topics) {
  const called = new Set();
  topics.flat().forEach((t) => {
    listeners.get(t)?.forEach((handler) => {
      if (called.has(handler)) return;
      called.add(handler);
      handler(t);
    });
  });
}
