export type ShellMode = 'app' | 'admin';

const STORAGE_KEY = 'ku-shell-mode';

/** 正式版按域名区分；原型里默认 admin. 前缀命中，换真实域名时只改这一处。 */
export function isAdminHost(hostname: string): boolean {
  return hostname.startsWith('admin.');
}

function readStoredMode(): ShellMode | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'admin' || raw === 'app' ? raw : null;
}

export function resolveInitialShellMode(): ShellMode {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('mode');
  if (fromQuery === 'admin' || fromQuery === 'app') {
    localStorage.setItem(STORAGE_KEY, fromQuery);
    return fromQuery;
  }
  return readStoredMode() ?? (isAdminHost(window.location.hostname) ? 'admin' : 'app');
}

let currentMode: ShellMode = resolveInitialShellMode();
const listeners = new Set<() => void>();

export function getShellMode(): ShellMode {
  return currentMode;
}

export function setShellMode(mode: ShellMode): void {
  if (mode === currentMode) return;
  currentMode = mode;
  localStorage.setItem(STORAGE_KEY, mode);
  listeners.forEach(listener => listener());
}

export function subscribeShellMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
