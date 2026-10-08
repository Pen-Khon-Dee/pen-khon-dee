import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  addAdminMenuItem,
  getAdminCategories,
  getAdminMenu,
  getAdminReservations,
  getAdminSession,
  setAdminMenuAvailability,
  setAdminReservationStatus,
} from '../api';

const SESSION_KEY = 'pen_khon_dee_cashier';
const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const baht = (value) => `฿${Number(value).toLocaleString('th-TH')}`;

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export default function Admin() {
  const [session, setSession] = useState(readSession);
  const [tab, setTab] = useState('menu');
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [date, setDate] = useState(today);
  const [item, setItem] = useState({ menu_name: '', price: '', category_id: '' });
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMenu = useCallback(async (token) => {
    const [categoryRows, menuRows] = await Promise.all([
      getAdminCategories(token),
      getAdminMenu(token),
    ]);
    setCategories(categoryRows);
    setMenu(menuRows);
    setItem((current) => ({
      ...current,
      category_id: current.category_id || String(categoryRows[0]?.category_id || ''),
    }));
  }, []);

  const loadReservations = useCallback(async (token, selectedDate = date) => {
    setReservations(await getAdminReservations(selectedDate, token));
  }, [date]);

  useEffect(() => {
    if (!session?.token) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { employee } = await getAdminSession(session.token);
        if (employee?.role !== 'Cashier') throw new Error('ต้องใช้บัญชี Cashier เพื่อเข้าใช้งาน');
        if (!alive) return;
        const verified = { token: session.token, employee };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(verified));
        setSession(verified);
        await Promise.all([loadMenu(verified.token), loadReservations(verified.token)]);
      } catch (err) {
        if (!alive) return;
        sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
        setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [session?.token, loadMenu, loadReservations]);

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setMenu([]);
    setReservations([]);
  };

  const addItem = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await addAdminMenuItem({
        menu_name: item.menu_name.trim(),
        price: Number(item.price),
        category_id: Number(item.category_id),
      }, session.token);
      setItem((current) => ({ ...current, menu_name: '', price: '' }));
      await loadMenu(session.token);
      setNotice('เพิ่มรายการเมนูแล้ว');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const archiveItem = async (row) => {
    if (!window.confirm(`ซ่อน “${row.menu_name}” จากรายการขายหรือไม่?`)) return;
    setBusyId(row.menu_id);
    setError('');
    setNotice('');
    try {
      await setAdminMenuAvailability(row.menu_id, 'Discontinued', session.token);
      await loadMenu(session.token);
      setNotice('นำรายการออกจากการขายแล้ว');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const changeReservation = async (row, status) => {
    setBusyId(row.reservation_id);
    setError('');
    setNotice('');
    try {
      await setAdminReservationStatus(row.reservation_id, status, session.token);
      await loadReservations(session.token);
      setNotice(`อัปเดตการจอง #${row.reservation_id} แล้ว`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const changeDate = (value) => {
    setDate(value);
    setError('');
  };

  if (!session) return <Navigate to="/login" replace state={{ message: 'Please log in with a Cashier account to access admin.' }} />;

  return (
    <section className="admin-page">
      <div className="container">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">PEN KHON DEE · ADMIN</p>
            <h1 className="admin-title">Manage Restaurant</h1>
            <p className="admin-subtitle">Logged in as {session.employee?.name}</p>
          </div>
          <button type="button" className="btn admin-logout" onClick={logout}>Logout</button>
        </header>

        <div className="admin-tabs" role="tablist" aria-label="Management Sections">
          <button type="button" role="tab" aria-selected={tab === 'menu'} className={tab === 'menu' ? 'is-active' : ''} onClick={() => setTab('menu')}>Manage Menu</button>
          <button type="button" role="tab" aria-selected={tab === 'reservations'} className={tab === 'reservations' ? 'is-active' : ''} onClick={() => setTab('reservations')}>Reservation List</button>
        </div>

        {error && <p className="alert alert--error admin-message" role="alert">{error}</p>}
        {notice && <p className="alert alert--ok admin-message" role="status">{notice}</p>}
        {loading && <p className="admin-loading" role="status">Loading data…</p>}

        {tab === 'menu' ? (
          <div className="admin-section">
            <h2 className="admin-section__title">Add Menu Item</h2>
            <form className="admin-menu-form" onSubmit={addItem}>
              <label className="field">
                <span className="field__label">Menu Name</span>
                <input className="field__control" value={item.menu_name} onChange={(e) => setItem({ ...item, menu_name: e.target.value })} required />
              </label>
              <label className="field">
                <span className="field__label">Category</span>
                <select className="field__control" value={item.category_id} onChange={(e) => setItem({ ...item, category_id: e.target.value })} required>
                  <option value="" disabled>Select Category</option>
                  {categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field__label">Price (THB)</span>
                <input className="field__control" type="number" min="0" step="0.01" value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} required />
              </label>
              <button type="submit" className="btn btn--dark" disabled={loading || categories.length === 0}>เพิ่มรายการ</button>
            </form>

            <h2 className="admin-section__title admin-section__title--list">Menu Items</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Menu Name</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {menu.map((row) => (
                    <tr key={row.menu_id}>
                      <td data-label="Menu Name">{row.menu_name}</td>
                      <td data-label="Category">{row.category_name}</td>
                      <td data-label="Price">{baht(row.price)}</td>
                      <td data-label="Status"><span className={`admin-status ${row.availability_status === 'Available' ? 'is-available' : 'is-muted'}`}>{row.availability_status}</span></td>
                      <td data-label="Actions">{row.availability_status !== 'Discontinued' && <button type="button" className="admin-text-button" disabled={busyId === row.menu_id} onClick={() => archiveItem(row)}>Archive</button>}</td>
                    </tr>
                  ))}
                  {!menu.length && !loading && <tr><td colSpan="5" className="admin-empty">No menu items found</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="admin-footnote">Archiving an item will set its status to Discontinued to keep a record of the previous item</p>
          </div>
        ) : (
          <div className="admin-section">
            <div className="admin-reservation-heading">
              <h2 className="admin-section__title">Reservation List</h2>
              <label className="admin-date">Date
                <input type="date" value={date} onChange={(e) => changeDate(e.target.value)} />
              </label>
            </div>
            <div className="admin-reservation-list">
              {reservations.map((row) => (
                <article className="admin-reservation" key={row.reservation_id}>
                  <div className="admin-reservation__main">
                    <div className="admin-reservation__topline">
                      <h3>{row.customer?.name || 'No name specified'}</h3>
                      <span className={`admin-status ${row.reservation_status === 'Confirmed' ? 'is-available' : 'is-muted'}`}>{row.reservation_status}</span>
                    </div>
                    <p>{row.customer?.phone || '—'} · {row.number_of_guests} ที่นั่ง</p>
                    <p>โต๊ะ {row.table_numbers?.join(', ') || '—'} · {String(row.reservation_datetime).replace('T', ' ').slice(0, 16)}</p>
                  </div>
                  {row.reservation_status === 'Confirmed' && (
                    <div className="admin-reservation__actions">
                      <button type="button" disabled={busyId === row.reservation_id} onClick={() => changeReservation(row, 'Seated')}>Check In</button>
                      <button type="button" disabled={busyId === row.reservation_id} onClick={() => changeReservation(row, 'Cancelled')}>Cancel</button>
                      <button type="button" disabled={busyId === row.reservation_id} onClick={() => changeReservation(row, 'No-show')}>No Show</button>
                    </div>
                  )}
                </article>
              ))}
              {!reservations.length && !loading && <p className="admin-empty">No reservations found for the selected date</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
