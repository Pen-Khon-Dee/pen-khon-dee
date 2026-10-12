
import { useEffect, useMemo, useState } from 'react';
import {
  createCustomerOrder,
  getAvailableTables,
  getCustomerMenu,
} from './api';
import { baht } from './lib/format';
import Header from './components/Header';
import TablePicker from './components/TablePicker';
import MenuList from './components/MenuList';
import Cart from './components/Cart';

export default function CustomerApp() {
  const queryTable = Number(new URLSearchParams(window.location.search).get('table'));
  const [menu, setMenu] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(
    Number.isInteger(queryTable) && queryTable > 0 ? String(queryTable) : ''
  );
  const [cart, setCart] = useState({});
  const [category, setCategory] = useState('All');
  const [cartOpen, setCartOpen] = useState(false);
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

        if (
          queryTable &&
          tableRows.some((t) => Number(t.table_number) === queryTable)
        ) {
          setSelectedTable(String(queryTable));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [queryTable]);

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, i) => sum + i.quantity * Number(i.price),
    0
  );

  const activeTable = Number(selectedTable);
  const selectedTableData = tables.find(
    (t) => Number(t.table_number) === activeTable
  );

  const canOrder = Boolean(
    selectedTableData?.qr_token && selectedTableData?.can_order
  );

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
        [item.menu_id]: {
          ...item,
          quantity,
          note: existing?.note || '',
        },
      };
    });
  };

  const updateNote = (menuId, note) => {
    setCart((current) => ({
      ...current,
      [menuId]: {
        ...current[menuId],
        note,
      },
    }));
  };

  const startNewOrder = () => {
    setCart({});
    setSelectedTable('');
    setNotice('');
    setError('');
  };

  const submitOrder = async () => {
    if (!selectedTableData) {
      setError('Please choose a table first.');
      return;
    }

    if (!canOrder) {
      setError('This table is not open for ordering. Please ask the cashier.');
      return;
    }

    if (!cartItems.length) {
      setError('Add at least one dish to your order.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    const items = cartItems.map(({ menu_id, quantity, note }) => ({
      menu_id,
      quantity,
      note,
    }));

    try {
      await createCustomerOrder(selectedTableData.qr_token, items);
      setNotice('Your order has been sent to the kitchen.');
      setCart({});
      setCartOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const shownTable = useMemo(
    () => activeTable || null,
    [activeTable]
  );

  return (
    <div className="page">
      <Header table={shownTable} orderId={null} />

      <main className="layout">
        <div className="layout__main">
          <section className="intro">
            <h1>Order from your table</h1>
            <p>Choose your dishes and we'll bring them over.</p>

            <TablePicker
              tables={tables}
              value={selectedTable}
              onChange={(v) => {
                setSelectedTable(v);
                setError('');
              }}
              order={null}
              onNewOrder={startNewOrder}
            />
          </section>

          {error && (
            <div className="feedback feedback--error" role="alert">
              {error}
            </div>
          )}

          {notice && (
            <div className="feedback feedback--ok" role="status">
              {notice}
            </div>
          )}

          <MenuList
            menu={menu}
            loading={loading}
            category={category}
            onCategory={setCategory}
            cart={cart}
            onChange={changeQuantity}
          />
        </div>

        <Cart
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          items={cartItems}
          total={cartTotal}
          hasOrder={false}
          canOrder={canOrder}
          submitting={submitting}
          loading={loading}
          onQuantity={changeQuantity}
          onNote={updateNote}
          onSubmit={submitOrder}
        />
      </main>

      {cartCount > 0 && !cartOpen && (
        <button
          type="button"
          className="cart-bar"
          onClick={() => setCartOpen(true)}
        >
          <span>
            View order · {cartCount} {cartCount === 1 ? 'item' : 'items'}
          </span>
          <strong>{baht(cartTotal)}</strong>
        </button>
      )}

      <footer className="footer">Pen Khon Dee</footer>
    </div>
  );
}
