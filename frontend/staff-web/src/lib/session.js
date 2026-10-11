export const SESSION_KEY = 'pen_khon_dee_staff';
const LEGACY_SESSION_KEY = 'pen_khon_dee_cashier';

export function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)
      || sessionStorage.getItem(LEGACY_SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveSession(value) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}
