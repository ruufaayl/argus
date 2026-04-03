export const BETA_MODE = typeof window !== 'undefined'
  && localStorage.getItem('argus-beta-mode') === 'true';
