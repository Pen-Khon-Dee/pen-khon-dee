import { useEffect, useMemo, useState } from 'react';
import {
  addCustomerOrderItems,
  createCustomerOrder,
  getAvailableTables,
  getCustomerMenu,
} from './api';

const ORDER_STORAGE_KEY = 'pen-khon-dee-customer-order';
const baht = (amount) => `฿${Number(amount).toLocaleString('en-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

function readOrderSession() {
  try {
    const value = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY));
    if (
      Number.isInteger(value?.order_id)
      && Number.isInteger(value?.table_number)
      && /^[a-f0-9]{64}$/.test(value?.access_token || '')
    ) return value;
  } catch {
    localStorage.removeItem(ORDER_STORAGE_KEY);
  }
  return null;
}

function ShoppingBagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

export default function CustomerApp() {
  const queryTable = Number(new URLSearchParams(window.location.search).get('table'));
  const [menu, setMenu] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(
    Number.isInteger(queryTable) && queryTable > 0 ? String(queryTable) : ''
  );
  const [orderSession, setOrderSession] = useState(readOrderSession);
  const [cart, setCart] = useState({});
  const [category, setCategory] = useState('All dishes');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getCustomerMenu(), getAvailableTables()])
      .then(([menuRows, tableRows]) => {
        if (!active) return;
        setMenu(menuRows);
        setTables(tableRows);
        const currentOrder = readOrderSession();
        if (currentOrder) {
          setOrderSession(currentOrder);
          setSelectedTable(String(currentOrder.table_number));
        } else if (queryTable && tableRows.some((table) => table.table_number === queryTable)) {
          setSelectedTable(String(queryTable));
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [queryTable]);

  const categories = useMemo(
    () => ['All dishes', ...new Set(menu.map((item) => item.category_name))],
    [menu]
  );
  const visibleMenu = useMemo(
    () => category === 'All dishes' ? menu : menu.filter((item) => item.category_name === category),
    [category, menu]
  );
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * Number(item.price), 0);
  const hasCurrentOrder = Boolean(orderSession);
  const activeTable = hasCurrentOrder ? orderSession.table_number : Number(selectedTable);
  const canOrder = hasCurrentOrder || tables.some((table) => table.table_number === activeTable);

  const changeQuantity = (item, adjustment) => {
    setCart((current) => {
      const existing = current[item.menu_id];
      const quantity = (existing?.quantity || 0) + adjustment;
      if (quantity <= 0) {
        const next = { ...current };
        delete next[item.menu_id];
        return next;
      }
      return {
        ...current,
        [item.menu_id]: { ...item, quantity, note: existing?.note || '' },
      };
    });
  };

  const updateNote = (menuId, note) => {
    setCart((current) => ({
      ...current,
      [menuId]: { ...current[menuId], note },
    }));
  };

  const startNewOrder = () => {
    localStorage.removeItem(ORDER_STORAGE_KEY);
    setOrderSession(null);
    setCart({});
    setNotice('');
    setError('');
    setTables((current) => current.filter((table) => table.table_number !== activeTable));
    setSelectedTable('');
  };

  const submitOrder = async () => {
    if (!canOrder) {
      setError('Choose an available table before placing your order.');
      return;
    }
    if (!cartItems.length) {
      setError('Add at least one dish to your order.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');
    const items = cartItems.map(({ menu_id, quantity, note }) => ({ menu_id, quantity, note }));
    try {
      if (orderSession) {
        await addCustomerOrderItems(orderSession, items);
        setNotice('Your additional dishes have been sent to the kitchen.');
      } else {
        const created = await createCustomerOrder(activeTable, items);
        const session = {
          order_id: Number(created.order_id),
          table_number: Number(activeTable),
          access_token: created.access_token,
        };
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(session));
        setOrderSession(session);
        setTables((current) => current.filter((table) => table.table_number !== activeTable));
        setNotice('Your order has been sent to the kitchen.');
      }
      setCart({});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ordering-app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Pen Khon Dee home">
          <span className="brand-name">Pen Khon Dee</span>
        </a>
        <div className="service-label">
          <span className="service-dot" />
          TABLE ORDERING
        </div>
        <span className="staff-link">TABLE SERVICE</span>
      </header>

      <main>
        <section className="welcome">
          <p className="eyebrow">GOOD FOOD, GOOD COMPANY</p>
          <h1>Something delicious<br />is just a few taps away.</h1>
          <p className="welcome-copy">Browse our kitchen's favorites and we'll bring them to your table.</p>
          <div className="table-picker">
            <label htmlFor="table-number">Your table</label>
            {hasCurrentOrder ? (
              <div className="current-table">Table {orderSession.table_number} <span>Order #{orderSession.order_id}</span></div>
            ) : (
              <select
                id="table-number"
                value={selectedTable}
                onChange={(event) => {
                  setSelectedTable(event.target.value);
                  setError('');
                }}
              >
                <option value="">Choose your table</option>
                {tables.map((table) => (
                  <option key={table.table_number} value={table.table_number}>
                    Table {table.table_number} · up to {table.capacity} guests
                  </option>
                ))}
              </select>
            )}
          </div>
          {hasCurrentOrder && (
            <button className="text-button" type="button" onClick={startNewOrder}>
              Start an order for another table
            </button>
          )}
        </section>

        {error && <div className="feedback feedback--error" role="alert">{error}</div>}
        {notice && <div className="feedback feedback--success" role="status">{notice}</div>}

        <div className="ordering-layout">
          <section className="menu-area" aria-label="Menu">
            <div className="section-heading">
              <div>
                <p className="eyebrow">FROM OUR KITCHEN</p>
                <h2>Explore the menu</h2>
              </div>
              {menu.length > 0 && <span className="dish-count">{menu.length} dishes</span>}
            </div>

            <nav className="category-list" aria-label="Menu categories">
              {categories.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={category === name ? 'category-chip category-chip--active' : 'category-chip'}
                  onClick={() => setCategory(name)}
                >
                  {name}
                </button>
              ))}
            </nav>

            {loading ? (
              <div className="empty-state">Loading today's menu…</div>
            ) : visibleMenu.length ? (
              <div className="menu-grid">
                {visibleMenu.map((item) => (
                  <article className="dish-card" key={item.menu_id}>
                    <div className="dish-art" aria-hidden="true">
                      <span>{item.category_name?.slice(0, 1)?.toUpperCase()}</span>
                      <i>✦</i>
                    </div>
                    <div className="dish-details">
                      <p className="dish-category">{item.category_name}</p>
                      <h3>{item.menu_name}</h3>
                      <div className="dish-footer">
                        <span className="dish-price">{baht(item.price)}</span>
                        {cart[item.menu_id] ? (
                          <div className="quantity-control" aria-label={`Quantity of ${item.menu_name}`}>
                            <button type="button" onClick={() => changeQuantity(item, -1)} aria-label={`Remove one ${item.menu_name}`}>−</button>
                            <span>{cart[item.menu_id].quantity}</span>
                            <button type="button" onClick={() => changeQuantity(item, 1)} aria-label={`Add one ${item.menu_name}`}>+</button>
                          </div>
                        ) : (
                          <button
                            className="add-button"
                            type="button"
                            onClick={() => changeQuantity(item, 1)}
                            aria-label={`Add ${item.menu_name}`}
                          >
                            <span aria-hidden="true">+</span> Add
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                {menu.length ? 'No dishes in this category right now.' : 'The menu is currently unavailable.'}
              </div>
            )}
          </section>

          <aside className="cart-panel" aria-label="Your order">
            <div className="cart-heading">
              <div className="cart-icon"><ShoppingBagIcon /></div>
              <div>
                <p className="eyebrow">MADE FOR YOUR TABLE</p>
                <h2>Your order <span>{cartCount}</span></h2>
              </div>
            </div>

            {!cartItems.length ? (
              <div className="cart-empty">
                <span aria-hidden="true">✦</span>
                <p>Your order is waiting.</p>
                <small>Add something delicious from the menu.</small>
              </div>
            ) : (
              <>
                <ul className="cart-items">
                  {cartItems.map((item) => (
                    <li className="cart-item" key={item.menu_id}>
                      <div className="cart-item-top">
                        <div>
                          <strong>{item.menu_name}</strong>
                          <small>{baht(item.price)} each</small>
                        </div>
                        <div className="quantity-control quantity-control--compact">
                          <button type="button" onClick={() => changeQuantity(item, -1)} aria-label={`Remove one ${item.menu_name}`}>−</button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => changeQuantity(item, 1)} aria-label={`Add one ${item.menu_name}`}>+</button>
                        </div>
                      </div>
                      <input
                        className="item-note"
                        value={item.note}
                        maxLength={255}
                        onChange={(event) => updateNote(item.menu_id, event.target.value)}
                        placeholder="Special request (optional)"
                        aria-label={`Special request for ${item.menu_name}`}
                      />
                      <div className="cart-line-total">{baht(Number(item.price) * item.quantity)}</div>
                    </li>
                  ))}
                </ul>
                <div className="cart-total">
                  <span>Subtotal</span>
                  <strong>{baht(cartTotal)}</strong>
                </div>
                <p className="cart-footnote">Payment is handled by our staff at the counter.</p>
                <button
                  className="submit-order"
                  type="button"
                  onClick={submitOrder}
                  disabled={submitting || loading || !canOrder}
                >
                  {submitting ? 'Sending order…' : hasCurrentOrder ? 'Send additional dishes' : 'Place order'}
                  {!submitting && <span>{baht(cartTotal)}</span>}
                </button>
                {!canOrder && <p className="table-hint">Choose an available table to place your order.</p>}
              </>
            )}
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <span>Pen Khon Dee</span>
        <span>Fresh from our kitchen, made for you.</span>
      </footer>
    </div>
  );
}
