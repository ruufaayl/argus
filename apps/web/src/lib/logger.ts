// ============================================================
// ARGUS — Centralized Logger
// Production: only ERROR and WARN shown
// Development: all levels shown
// ============================================================

const isDev = import.meta.env.DEV;

const PREFIX = '[ARGUS]';

export const logger = {
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, ...args),
  info: (...args: unknown[]) => { if (isDev) console.info(PREFIX, ...args); },
  debug: (...args: unknown[]) => { if (isDev) console.log(PREFIX, ...args); },
};
