import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  addAdminMenuItem,
  addAdminCategory,
  cancelAdminOrder,
  createAdminCustomer,
  createAdminOrder,
  createAdminReservation,
  enrollAdminMember,
  getAdminCategories,
  getAdminCustomer,
  getAdminMenu,
  getAdminReservations,
  getAdminSession,
  getAdminTableOrder,
  getAdminTables,
  payAdminOrder,
  renameAdminCategory,
  setAdminMenuAvailability,
  setAdminOrderCustomer,
  setAdminReservationStatus,
  updateAdminMenuItem,
} from '../api';

const SESSION_KEY = 'pen_khon_dee_cashier';
const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const baht = (value) => `฿${Number(value).toLocaleString('en-TH')}`;
const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  : '—';
const reservationStatusLabel = (status) => ({
  Confirmed: 'Confirmed',
  Seated: 'Seated',
  Cancelled: 'Cancelled',
  'No-show': 'No-show',
}[status] || status);

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export default function Admin() {
  const [session, setSession] = useState(readSession);
  const [tab, setTab] = useState('tables');
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [bill, setBill] = useState(null);
  const [memberPhone, setMemberPhone] = useState('');
  const [payment, setPayment] = useState(null);
  const [date, setDate] = useState(today);
  const [item, setItem] = useState({ menu_name: '', price: '', category_id: '' });
  const [editingMenu, setEditingMenu] = useState(null);
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState(null);
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingCustomer, setBookingCustomer] = useState(null);
  const [bookingNotFound, setBookingNotFound] = useState(false);
  const [bookingCustomerName, setBookingCustomerName] = useState('');
  const [bookingCustomerEmail, setBookingCustomerEmail] = useState('');
  const [bookingDate, setBookingDate] = useState(today);
  const [bookingTime, setBookingTime] = useState('18:00');
  const [bookingGuests, setBookingGuests] = useState('2');
  const [bookingTableIds, setBookingTableIds] = useState([]);
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

  const loadReservations = useCallback(async (token, selectedDate) => {
    setReservations(await getAdminReservations(selectedDate, token));
  }, []);
  const loadTables = useCallback(async (token) => {
    setTables(await getAdminTables(token));
  }, []);

  useEffect(() => {
    if (!session?.token) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { employee } = await getAdminSession(session.token);
        if (employee?.role !== 'Cashier') throw new Error('A Cashier account is required to access this dashboard.');
        if (!alive) return;
        const verified = { token: session.token, employee };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(verified));
        setSession(verified);
        await Promise.all([
          loadMenu(verified.token),
          loadReservations(verified.token, date),
          loadTables(verified.token),
        ]);
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
  }, [session?.token, loadMenu, loadReservations, loadTables]);

  useEffect(() => {
    if (!session?.token) return undefined;
    const timer = window.setInterval(() => {
      loadTables(session.token).catch((err) => setError(err.message));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [session?.token, loadTables]);

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setMenu([]);
    setReservations([]);
    setTables([]);
    setBill(null);
    setPayment(null);
  };

  const openTableOrder = async (table) => {
    setError('');
    setNotice('');
    setPayment(null);
    setBill(null);
    setMemberPhone('');
    try {
      setBill(await getAdminTableOrder(table.table_number, session.token));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleTableSelection = (table) => {
    setSelectedTables((current) => current.includes(table.table_id)
      ? current.filter((id) => id !== table.table_id)
      : [...current, table.table_id]);
  };

  const startOrder = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const created = await createAdminOrder(selectedTables, session.token);
      setBill(created);
      setSelectedTables([]);
      setPayment(null);
      await loadTables(session.token);
      setNotice(`Opened a bill for table${created.table_numbers.length === 1 ? '' : 's'} ${created.table_numbers.join(', ')}.`);
    } catch (err) {
      setError(err.message);
      await loadTables(session.token).catch((loadError) => setError(loadError.message));
    } finally {
      setLoading(false);
    }
  };

  const attachMember = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      setBill(await setAdminOrderCustomer(bill.order_id, memberPhone.trim(), session.token));
      setNotice('Member linked and discount applied.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const payOrder = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const result = await payAdminOrder(bill.order_id, session.token);
      setPayment(result);
      setNotice('Payment completed.');
      await loadTables(session.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await cancelAdminOrder(bill.order_id, session.token);
      setBill(null);
      setPayment(null);
      setNotice('Order cancelled.');
      await loadTables(session.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const payload = {
        menu_name: item.menu_name.trim(),
        price: Number(item.price),
        category_id: Number(item.category_id),
      };
      if (editingMenu) await updateAdminMenuItem(editingMenu.menu_id, payload, session.token);
      else await addAdminMenuItem(payload, session.token);
      setItem((current) => ({ ...current, menu_name: '', price: '' }));
      setEditingMenu(null);
      await loadMenu(session.token);
      setNotice(editingMenu ? 'Menu item updated.' : 'Menu item added.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const changeMenuStatus = async (row, availability_status) => {
    setBusyId(row.menu_id);
    setError('');
    setNotice('');
    try {
      await setAdminMenuAvailability(row.menu_id, availability_status, session.token);
      await loadMenu(session.token);
      setNotice(`Updated the status of "${row.menu_name}".`);
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
      const updated = await setAdminReservationStatus(row.reservation_id, status, session.token);
      if (status === 'Seated') {
        const openedBill = await createAdminOrder(updated.table_ids, session.token);
        setBill(openedBill);
        setPayment(null);
        setTab('tables');
        await loadTables(session.token);
      }
      await loadReservations(session.token, date);
      setNotice(status === 'Seated'
        ? `Reservation #${row.reservation_id} checked in. Opened a bill for table${updated.table_numbers.length === 1 ? '' : 's'} ${updated.table_numbers.join(', ')}.`
        : `Reservation #${row.reservation_id} updated.`);
    } catch (err) {
      setError(err.message);
      await Promise.all([
        loadReservations(session.token, date),
        loadTables(session.token),
      ]).catch((refreshError) => setError(`${err.message} · Refresh failed: ${refreshError.message}`));
    } finally {
      setBusyId(null);
    }
  };

  const changeDate = (value) => {
    setDate(value);
    setError('');
    loadReservations(session.token, value).catch((err) => setError(err.message));
  };

  const findCustomer = async (phone, setFound, setNotFound) => {
    setError('');
    setNotice('');
    setFound(null);
    setNotFound(false);
    if (!phone.trim()) {
      setError('Enter a phone number.');
      return;
    }
    setLoading(true);
    try {
      setFound(await getAdminCustomer(phone.trim(), session.token));
      setNotFound(false);
    } catch (err) {
      if (err.message.includes('No customer with this phone number')) {
        setNotFound(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const createBookingCustomer = async () => {
    setError('');
    setLoading(true);
    try {
      const created = await createAdminCustomer({
        name: bookingCustomerName.trim(),
        phone: bookingPhone.trim(),
        ...(bookingCustomerEmail.trim() ? { email: bookingCustomerEmail.trim() } : {}),
      }, session.token);
      setBookingCustomer(created);
      setBookingNotFound(false);
      setNotice('Customer added.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitReservation = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!bookingCustomer || !bookingTableIds.length) {
      setError('Find or add a customer and select at least one table.');
      return;
    }
    setLoading(true);
    try {
      await createAdminReservation({
        customer_id: bookingCustomer.customer_id,
        reservation_datetime: `${bookingDate} ${bookingTime}:00`,
        number_of_guests: Number(bookingGuests),
        table_ids: bookingTableIds,
      }, session.token);
      setBookingCustomer(null);
      setBookingPhone('');
      setBookingNotFound(false);
      setBookingCustomerName('');
      setBookingCustomerEmail('');
      setBookingTableIds([]);
      await loadReservations(session.token, date);
      await loadTables(session.token);
      setNotice('Reservation created.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const customerForm = new FormData(form);
    const name = String(customerForm.get('customerName') || '').trim();
    const email = String(customerForm.get('customerEmail') || '').trim();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const created = await createAdminCustomer({
        name,
        phone: customerPhone.trim(),
        ...(email ? { email } : {}),
      }, session.token);
      setCustomer(created);
      setCustomerNotFound(false);
      form.reset();
      setNotice('Customer added.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const enrollCustomer = async () => {
    setError('');
    setLoading(true);
    try {
      const updated = await enrollAdminMember(customer.customer_id, session.token);
      setCustomer(updated);
      setNotice('Membership created.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editingCategory) {
        await renameAdminCategory(editingCategory.category_id, editingCategory.category_name.trim(), session.token);
      } else {
        await addAdminCategory(newCategory.trim(), session.token);
      }
      setEditingCategory(null);
      setNewCategory('');
      await loadMenu(session.token);
      setNotice(editingCategory ? 'Category renamed.' : 'Category added.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <Navigate to="/login" replace state={{ message: 'Please sign in with a Cashier account to access the admin dashboard.' }} />;

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
          <button type="button" role="tab" aria-selected={tab === 'tables'} className={tab === 'tables' ? 'is-active' : ''} onClick={() => setTab('tables')}>Tables</button>
          <button type="button" role="tab" aria-selected={tab === 'reservations'} className={tab === 'reservations' ? 'is-active' : ''} onClick={() => setTab('reservations')}>Reservations</button>
          <button type="button" role="tab" aria-selected={tab === 'customers'} className={tab === 'customers' ? 'is-active' : ''} onClick={() => setTab('customers')}>Customers & Members</button>
          <button type="button" role="tab" aria-selected={tab === 'menu'} className={tab === 'menu' ? 'is-active' : ''} onClick={() => setTab('menu')}>Manage Menu</button>
        </div>

        {error && <p className="alert alert--error admin-message" role="alert">{error}</p>}
        {notice && <p className="alert alert--ok admin-message" role="status">{notice}</p>}
        {loading && <p className="admin-loading" role="status">Loading data…</p>}

        {tab === 'tables' ? (
          <div className="admin-section">
            <div className="admin-reservation-heading">
              <div>
                <h2 className="admin-section__title">Table Status</h2>
                <p className="admin-footnote">Automatically refreshes every 30 seconds</p>
              </div>
              <button type="button" className="admin-refresh" onClick={() => loadTables(session.token).catch((err) => setError(err.message))}>Refresh</button>
            </div>
            <div className="admin-table-grid">
              {tables.map((table) => {
                const occupied = table.table_status === 'Occupied';
                const selected = selectedTables.includes(table.table_id);
                const alert = occupied ? (table.time_alert || 'normal') : 'available';
                return (
                  <button
                    type="button"
                    key={table.table_id}
                    className={`admin-table-card is-${alert}${selected ? ' is-selected' : ''}`}
                    onClick={() => occupied ? openTableOrder(table) : toggleTableSelection(table)}
                    aria-pressed={occupied ? undefined : selected}
                  >
                    <span className="admin-table-card__top">
                      <strong>Table {table.table_number}</strong>
                      <span className="admin-status">{occupied ? 'Occupied' : 'Available'}</span>
                    </span>
                    <span>Capacity: {table.capacity}</span>
                    {occupied ? (
                      <>
                        <span>Seated for {table.minutes_seated ?? 0} min</span>
                        <span>Should leave at {formatTime(table.should_leave_at)}</span>
                      </>
                    ) : <span>Select to open an order</span>}
                    {table.upcoming_reservation && (
                      <span className="admin-table-card__reservation">Reservation at {formatTime(table.upcoming_reservation)}</span>
                    )}
                  </button>
                );
              })}
              {!tables.length && !loading && <p className="admin-empty">No table data found.</p>}
            </div>
            <div className="admin-table-actions">
              <p>Select multiple available tables to open a combined order{selectedTables.length ? ` · ${selectedTables.length} selected` : ''}</p>
              <button type="button" className="btn btn--dark" disabled={!selectedTables.length || loading} onClick={startOrder}>Open Order</button>
            </div>

            {bill && (
              <section className="admin-bill" aria-labelledby="admin-bill-title">
                <div className="admin-reservation-heading">
                  <div>
                    <h2 id="admin-bill-title" className="admin-section__title">Bill · Table {bill.table_numbers?.join(', ')}</h2>
                    <p className="admin-footnote">Order #{bill.order_id}</p>
                  </div>
                  <button type="button" className="admin-text-button" onClick={() => { setBill(null); setPayment(null); }}>Close Bill</button>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Status</th></tr></thead>
                    <tbody>
                      {bill.items?.map((row) => (
                        <tr key={row.order_item_id} className={row.item_status === 'Cancelled' ? 'is-cancelled' : ''}>
                          <td data-label="Item">{row.menu_name}{row.note ? ` · ${row.note}` : ''}</td>
                          <td data-label="Qty">{row.quantity}</td>
                          <td data-label="Price">{baht(row.subtotal)}</td>
                          <td data-label="Status">{row.item_status}</td>
                        </tr>
                      ))}
                      {!bill.items?.length && <tr><td colSpan="4" className="admin-empty">There are no items on this bill yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <dl className="admin-bill-totals">
                  <div><dt>Subtotal</dt><dd>{baht(bill.items_total)}</dd></div>
                  <div><dt>Discount</dt><dd>−{baht(bill.discount_amount)}</dd></div>
                  <div className="admin-bill-totals__grand"><dt>Amount Due</dt><dd>{baht(bill.total_amount)}</dd></div>
                </dl>
                <p className="admin-bill-member">Member: {bill.customer ? `${bill.customer.name} · ${bill.customer.member_level || 'Member'}` : 'No member linked'}</p>
                {!payment && (
                  <form className="admin-member-form" onSubmit={attachMember}>
                    <label className="field">
                      <span className="field__label">Member phone number for a discount</span>
                      <input className="field__control" type="tel" value={memberPhone} onChange={(e) => setMemberPhone(e.target.value)} required />
                    </label>
                    <button type="submit" className="btn btn--dark" disabled={loading}>Link Member</button>
                  </form>
                )}
                {payment && (
                  <div className="admin-payment-result" role="status">
                    <strong>Payment received: {baht(payment.total_amount)}</strong>
                    {payment.current_points != null && <p>Earned {payment.points_earned} points · Current balance: {payment.current_points} points</p>}
                    {payment.level_up && <p>Congratulations! Membership upgraded to {payment.member_level}.</p>}
                  </div>
                )}
                <div className="admin-bill-actions">
                  {!payment && <button type="button" className="btn btn--dark" disabled={loading || !bill.items?.some((row) => row.item_status !== 'Cancelled')} onClick={payOrder}>Paid</button>}
                  {!payment && !bill.items?.some((row) => row.item_status === 'Served') && (
                    <button type="button" className="admin-cancel-order" disabled={loading} onClick={cancelOrder}>Cancel Order</button>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : tab === 'customers' ? (
          <div className="admin-section">
            <h2 className="admin-section__title">Find Customers & Members</h2>
            <form className="admin-customer-search" onSubmit={(event) => {
              event.preventDefault();
              findCustomer(customerPhone, setCustomer, setCustomerNotFound);
            }}>
              <label className="field">
                <span className="field__label">Phone number</span>
                <input className="field__control" type="tel" value={customerPhone} onChange={(event) => {
                  setCustomerPhone(event.target.value);
                  setCustomer(null);
                  setCustomerNotFound(false);
                }} required />
              </label>
              <button type="submit" className="btn btn--dark" disabled={loading}>Search</button>
            </form>
            {customer && (
              <article className="admin-customer-card">
                <h3>{customer.name}</h3>
                <p>{customer.phone} · {customer.email || 'No email provided'}</p>
                <p>Membership level: {customer.member?.member_level || 'Not a member'}</p>
                <p>Current points: {customer.member?.current_points ?? 0}</p>
                {!customer.member && <button type="button" className="btn btn--dark" disabled={loading} onClick={enrollCustomer}>Enroll as Member</button>}
              </article>
            )}
            {customerNotFound && (
              <form className="admin-customer-create" onSubmit={createCustomer}>
                <h3>Customer not found · Add a new customer</h3>
                <label className="field"><span className="field__label">Name</span><input className="field__control" name="customerName" required /></label>
                <label className="field"><span className="field__label">Phone number</span><input className="field__control" value={customerPhone} readOnly /></label>
                <label className="field"><span className="field__label">Email (optional)</span><input className="field__control" name="customerEmail" type="email" /></label>
                <button type="submit" className="btn btn--dark" disabled={loading}>Add Customer</button>
              </form>
            )}
          </div>
        ) : tab === 'menu' ? (
          <div className="admin-section">
            <h2 className="admin-section__title">{editingMenu ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
            <form className="admin-menu-form" onSubmit={addItem}>
              <label className="field">
                <span className="field__label">Menu name</span>
                <input className="field__control" value={item.menu_name} onChange={(e) => setItem({ ...item, menu_name: e.target.value })} required />
              </label>
              <label className="field">
                <span className="field__label">Category</span>
                <select className="field__control" value={item.category_id} onChange={(e) => setItem({ ...item, category_id: e.target.value })} required>
                  <option value="" disabled>Select a category</option>
                  {categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field__label">Price (THB)</span>
                <input className="field__control" type="number" min="0" step="0.01" value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} required />
              </label>
              <div className="admin-form-actions">
                <button type="submit" className="btn btn--dark" disabled={loading || categories.length === 0}>{editingMenu ? 'Save Menu Item' : 'Add Menu Item'}</button>
                {editingMenu && <button type="button" className="admin-refresh" onClick={() => { setEditingMenu(null); setItem({ menu_name: '', price: '', category_id: String(categories[0]?.category_id || '') }); }}>Cancel</button>}
              </div>
            </form>

            <section className="admin-categories">
              <h2 className="admin-section__title">Manage Categories</h2>
              <form className="admin-category-add" onSubmit={saveCategory}>
                <label className="field">
                  <span className="field__label">{editingCategory ? 'Rename category' : 'Add a new category'}</span>
                  <input className="field__control" value={editingCategory ? editingCategory.category_name : newCategory} onChange={(event) => editingCategory
                    ? setEditingCategory({ ...editingCategory, category_name: event.target.value })
                    : setNewCategory(event.target.value)} required />
                </label>
                <button type="submit" className="btn btn--dark" disabled={loading}>{editingCategory ? 'Save Name' : 'Add Category'}</button>
                {editingCategory && <button type="button" className="admin-refresh" onClick={() => setEditingCategory(null)}>Cancel</button>}
              </form>
              <div className="admin-category-list">
                {categories.map((category) => (
                  <button type="button" key={category.category_id} onClick={() => {
                    setEditingCategory(category);
                    setNewCategory('');
                  }}>{category.category_name} · Rename</button>
                ))}
              </div>
            </section>

            <div className="admin-menu-list-heading">
              <h2 className="admin-section__title admin-section__title--list">Menu Items</h2>
              <label><input type="checkbox" checked={showDiscontinued} onChange={(event) => setShowDiscontinued(event.target.checked)} /> Show discontinued items</label>
            </div>
            {categories.map((category) => {
              const categoryItems = menu.filter((row) => row.category_id === category.category_id
                && (showDiscontinued || row.availability_status !== 'Discontinued'));
              if (!categoryItems.length) return null;
              return (
                <section className="admin-menu-category" key={category.category_id}>
                  <h3>{category.category_name}</h3>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>Menu item</th><th>Price</th><th>Status (change instantly)</th><th>Actions</th></tr></thead>
                      <tbody>
                        {categoryItems.map((row) => (
                          <tr key={row.menu_id}>
                            <td data-label="Menu item">{row.menu_name}</td>
                            <td data-label="Price">{baht(row.price)}</td>
                            <td data-label="Status">
                              <select className="admin-status-select" value={row.availability_status} disabled={busyId === row.menu_id} onChange={(event) => changeMenuStatus(row, event.target.value)}>
                                <option value="Available">Available</option>
                                <option value="Sold_Out">Sold Out</option>
                                <option value="Discontinued">Discontinued</option>
                              </select>
                            </td>
                            <td data-label="Actions">
                              <button type="button" className="admin-text-button" onClick={() => {
                                setEditingMenu(row);
                                setItem({ menu_name: row.menu_name, price: String(row.price), category_id: String(row.category_id) });
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}>Edit</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
            {!menu.length && !loading && <p className="admin-empty">No menu items found.</p>}
          </div>
        ) : tab === 'reservations' ? (
          <div className="admin-section">
            <div className="admin-reservation-heading">
              <h2 className="admin-section__title">Reservations</h2>
              <label className="admin-date">Date
                <input type="date" value={date} onChange={(e) => changeDate(e.target.value)} />
              </label>
            </div>
            <form className="admin-new-reservation" onSubmit={submitReservation}>
              <h3>Create a Reservation</h3>
              <div className="admin-booking-customer-search">
                <label className="field">
                  <span className="field__label">Find customer by phone number</span>
                  <input className="field__control" type="tel" value={bookingPhone} onChange={(event) => {
                    setBookingPhone(event.target.value);
                    setBookingCustomer(null);
                    setBookingNotFound(false);
                  }} required />
                </label>
                <button type="button" className="admin-refresh" disabled={loading} onClick={() => findCustomer(bookingPhone, setBookingCustomer, setBookingNotFound)}>Find Customer</button>
              </div>
              {bookingCustomer && <p className="admin-booking-customer-result">Customer: <strong>{bookingCustomer.name}</strong> · {bookingCustomer.phone}</p>}
              {bookingNotFound && (
                <div className="admin-booking-create-customer">
                  <p>Customer not found. Add their details before creating a reservation.</p>
                  <label className="field"><span className="field__label">Customer name</span><input className="field__control" value={bookingCustomerName} onChange={(event) => setBookingCustomerName(event.target.value)} required /></label>
                  <label className="field"><span className="field__label">Email (optional)</span><input className="field__control" type="email" value={bookingCustomerEmail} onChange={(event) => setBookingCustomerEmail(event.target.value)} /></label>
                  <button type="button" className="admin-refresh" disabled={loading || !bookingCustomerName.trim()} onClick={createBookingCustomer}>Add Customer</button>
                </div>
              )}
              <div className="admin-reservation-form-fields">
                <label className="field"><span className="field__label">Date</span><input className="field__control" type="date" min={today()} value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} required /></label>
                <label className="field"><span className="field__label">Time</span><input className="field__control" type="time" value={bookingTime} onChange={(event) => setBookingTime(event.target.value)} required /></label>
                <label className="field"><span className="field__label">Guests</span><input className="field__control" type="number" min="1" max="255" value={bookingGuests} onChange={(event) => setBookingGuests(event.target.value)} required /></label>
              </div>
              <fieldset className="admin-booking-tables">
                <legend>Select Tables</legend>
                {tables.map((table) => (
                  <label key={table.table_id}>
                    <input type="checkbox" checked={bookingTableIds.includes(table.table_id)} onChange={() => setBookingTableIds((current) => current.includes(table.table_id)
                      ? current.filter((id) => id !== table.table_id)
                      : [...current, table.table_id])} />
                    Table {table.table_number} · {table.capacity} seats
                  </label>
                ))}
              </fieldset>
              <button type="submit" className="btn btn--dark" disabled={loading || !bookingCustomer || !bookingTableIds.length}>Create Reservation</button>
            </form>
            <div className="admin-reservation-list">
              {reservations.map((row) => (
                <article className="admin-reservation" key={row.reservation_id}>
                  <div className="admin-reservation__main">
                    <div className="admin-reservation__topline">
                      <h3>{row.customer?.name || 'No name specified'}</h3>
                      <span className={`admin-status ${row.reservation_status === 'Confirmed' ? 'is-available' : 'is-muted'}`}>{reservationStatusLabel(row.reservation_status)}</span>
                    </div>
                    <p>{row.customer?.phone || '—'} · {row.number_of_guests} guests</p>
                    <p>Table {row.table_numbers?.join(', ') || '—'} · {formatTime(row.reservation_datetime)}</p>
                    {row.reservation_status === 'Confirmed' && row.late_minutes > 0 && <p className={row.late_minutes > 30 ? 'admin-reservation-late is-overdue' : 'admin-reservation-late'}>{row.late_minutes} minutes late</p>}
                  </div>
                  {row.reservation_status === 'Confirmed' && (
                    <div className="admin-reservation__actions">
                      <button type="button" disabled={busyId === row.reservation_id} onClick={() => changeReservation(row, 'Seated')}>Seat · Check In & Open Bill</button>
                      <button type="button" disabled={busyId === row.reservation_id} onClick={() => changeReservation(row, 'Cancelled')}>Cancel</button>
                      {row.late_minutes > 30 && <button type="button" className="admin-no-show" disabled={busyId === row.reservation_id} onClick={() => changeReservation(row, 'No-show')}>No-show · Over 30 min</button>}
                    </div>
                  )}
                </article>
              ))}
              {!reservations.length && !loading && <p className="admin-empty">No reservations found for the selected date.</p>}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
