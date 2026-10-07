import { menuItems } from './data/menu';

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Can not connect to the server. Please check your internet connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'An error occurred. Please try again.');
  }
  return data;
}

/* ---------- GET /api/menu ---------- */
export async function getMenu() {
  if (MOCK) {
    await sleep(250);
    return menuItems;
  }
  return request('/menu');
}

/* ---------- POST /api/auth/register ---------- */
export async function register({ name, email, phone, password }) {
  if (MOCK) {
    await sleep(500);
    const users = read('nero_mock_users', []);
    const key = email.trim().toLowerCase();
    if (users.some((u) => u.email === key)) {
      throw new Error('This email is already registered.');
    }
    const user = { id: Date.now(), name, email: key, phone, password };
    write('nero_mock_users', [...users, user]);
    return { message: 'Registration successful.' };
  }
  return request('/auth/register', {
    method: 'POST',
    body: { name, email, phone, password },
  });
}

/* ---------- POST /api/auth/login ---------- */
export async function login({ email, password }) {
  if (MOCK) {
    await sleep(500);
    const key = email.trim().toLowerCase();
    const found = read('nero_mock_users', []).find(
      (u) => u.email === key && u.password === password
    );
    if (!found) throw new Error('Invalid email or password.');
    const { password: _omit, ...user } = found;
    return { token: `mock-${user.id}`, user };
  }
  return request('/auth/login', { method: 'POST', body: { email, password } });
}

/* ---------- POST /api/reservations ---------- */
export async function createReservation(payload, token) {
  if (MOCK) {
    await sleep(600);
    const code = `NR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const booking = { id: Date.now(), code, ...payload };
    write('nero_mock_bookings', [...read('nero_mock_bookings', []), booking]);
    return booking;
  }
  return request('/reservations', { method: 'POST', body: payload, token });
}
