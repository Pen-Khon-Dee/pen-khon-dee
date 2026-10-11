import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAdminSession, getAdminTables } from '../api';
import { clearSession, readSession, saveSession } from '../lib/session';
import Wordmark from './Wordmark';

const NAV = [
  { to: '/admin/tables', label: 'Tables', icon: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z' },
  { to: '/admin/reservations', label: 'Reservations', icon: 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4' },
  { to: '/admin/customers', label: 'Customers', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-4 3.6-6 8-6s8 2 8 6' },
  { to: '/admin/menu', label: 'Menu', icon: 'M6 3v8a2 2 0 0 0 2 2v8M10 3v8M8 3v18M17 21V3c-2 1-3 4-3 8h3' },
];

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav__icon">
      <path d={d} />
    </svg>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const [session, setSession] = useState(readSession);
  const [authError, setAuthError] = useState('');
  const [tables, setTables] = useState([]);
  const [bill, setBill] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const token = session?.token;

  const loadTables = useCallback(async () => {
    setTables(await getAdminTables(token));
  }, [token]);

  // ครอบการเรียก API: เคลียร์ข้อความ, แสดง loading, จับ error
  const run = useCallback(async (fn) => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      return await fn();
    } catch (err) {
      setError(err.message);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { employee } = await getAdminSession(token);
        if (employee?.role !== 'Cashier') throw new Error('A Cashier account is required to access this dashboard.');
        if (!alive) return;
        const verified = { token, employee };
        saveSession(verified);
        setSession(verified);
        await loadTables();
      } catch (err) {
        if (!alive) return;
        clearSession();
        setAuthError(err.message);
        setSession(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, loadTables]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = window.setInterval(() => {
      loadTables().catch((err) => setError(err.message));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [token, loadTables]);

  useEffect(() => {
    setError('');
    setNotice('');
  }, [location.pathname]);

  const logout = () => {
    clearSession();
    setSession(null);
  };

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: authError || 'Please sign in with a Cashier account to continue.' }}
      />
    );
  }

  const ctx = {
    token, tables, loadTables, bill, setBill, payment, setPayment,
    loading, run, error, setError, notice, setNotice,
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand"><Wordmark /></div>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}>
              <Icon d={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__user">
          <div>
            <p className="sidebar__name">{session.employee?.name}</p>
            <p className="sidebar__role">{session.employee?.role}</p>
          </div>
          <button type="button" className="link-button" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className="shell__body">
        <div className={`progress${loading ? ' is-on' : ''}`} aria-hidden="true" />
        <main id="main" className="content">
          {error && (
            <div className="banner banner--error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss">×</button>
            </div>
          )}
          {notice && (
            <div className="banner banner--ok" role="status">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss">×</button>
            </div>
          )}
          <Outlet context={ctx} />
        </main>
      </div>
    </div>
  );
}
