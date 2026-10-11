import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getAdminSession, getKitchenBoard, setOrderItemStatus } from '../api';
import Wordmark from '../components/Wordmark';
import { clearSession, readSession, saveSession } from '../lib/session';

const ROLE_DETAILS = {
  Kitchen: {
    title: 'Kitchen',
    description: 'Prepare incoming dishes and send completed items to the dining room.',
  },
  Server: {
    title: 'Server',
    description: 'Deliver completed dishes to the tables and mark them as served.',
  },
};

export default function Workstation({ role }) {
  const [session, setSession] = useState(readSession);
  const [verified, setVerified] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingItem, setUpdatingItem] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const token = session?.token;

  const loadBoard = useCallback(async () => {
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      setOrders(await getKitchenBoard(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setVerified(true);
      return undefined;
    }
    let active = true;
    getAdminSession(token)
      .then(({ employee }) => {
        if (!active) return;
        const currentSession = { token, employee };
        saveSession(currentSession);
        setSession(currentSession);
        setVerified(true);
      })
      .catch((err) => {
        if (!active) return;
        clearSession();
        setSession(null);
        setError(err.message);
        setVerified(true);
      });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!verified || session?.employee?.role !== role) return undefined;
    loadBoard();
    const timer = window.setInterval(loadBoard, 10_000);
    return () => window.clearInterval(timer);
  }, [verified, session, role, loadBoard]);

  const visibleOrders = useMemo(() => orders.map((order) => ({
    ...order,
    items: order.items.filter((item) => (
      role === 'Kitchen' ? item.item_status === 'Pending' : item.item_status === 'Ready'
    )),
  })).filter((order) => order.items.length > 0), [orders, role]);

  const updateItem = async (item, status) => {
    setUpdatingItem(item.order_item_id);
    setError('');
    setNotice('');
    try {
      await setOrderItemStatus(item.order_item_id, status, token);
      setNotice(status === 'Ready' ? 'Dish marked ready for serving.' : (
        status === 'Served' ? 'Dish marked as served.' : 'Dish cancelled.'
      ));
      await loadBoard();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingItem(null);
    }
  };

  if (!verified) {
    return <main className="workstation-loading">Checking staff session…</main>;
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ message: error || 'Please sign in to continue.' }} />;
  }
  if (session.employee?.role !== role) {
    if (session.employee?.role === 'Kitchen') return <Navigate to="/kitchen" replace />;
    if (session.employee?.role === 'Server') return <Navigate to="/server" replace />;
    return <Navigate to="/admin/tables" replace />;
  }

  const details = ROLE_DETAILS[role];
  const itemCount = visibleOrders.reduce((sum, order) => sum + order.items.length, 0);

  return (
    <div className={`workstation workstation--${role.toLowerCase()}`}>
      <header className="workstation__header">
        <a href="/" className="workstation__brand" aria-label="Pen Khon Dee home">
          <Wordmark />
        </a>
        <div className="workstation__identity">
          <span className="workstation__role">{details.title}</span>
          <span className="workstation__employee">{session.employee?.name}</span>
          <button type="button" className="link-button" onClick={() => {
            clearSession();
            setSession(null);
          }}>Sign out</button>
        </div>
      </header>

      <main className="workstation__content">
        <header className="page-head">
          <div>
            <h1 className="page-title">{details.title} board</h1>
            <p className="muted">{details.description}</p>
          </div>
          <div className="page-head__actions">
            <span className="workstation__count">{itemCount} {role === 'Kitchen' ? 'to prepare' : 'to serve'}</span>
            <button type="button" className="btn btn--ghost" onClick={loadBoard} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        {error && <div className="banner banner--error" role="alert">{error}</div>}
        {notice && <div className="banner banner--ok" role="status">{notice}</div>}

        {visibleOrders.length > 0 ? (
          <div className="ticket-grid">
            {visibleOrders.map((order) => (
              <section className="ticket" key={order.order_id} aria-label={`Order ${order.order_id}`}>
                <header className="ticket__head">
                  <div>
                    <p className="ticket__eyebrow">Order #{order.order_id}</p>
                    <h2 className="ticket__tables">
                      {order.table_numbers.map((table) => `Table ${table}`).join(' · ')}
                    </h2>
                  </div>
                  <span className={`status-pill status-pill--${role.toLowerCase()}`}>
                    {role === 'Kitchen' ? 'In kitchen' : 'Ready'}
                  </span>
                </header>
                <ul className="ticket__items">
                  {order.items.map((item) => (
                    <li className="ticket-item" key={item.order_item_id}>
                      <div className="ticket-item__info">
                        <span className="ticket-item__quantity">{item.quantity}×</span>
                        <div>
                          <h3 className="ticket-item__name">{item.menu_name}</h3>
                          {item.note && <p className="ticket-item__note">Note: {item.note}</p>}
                        </div>
                      </div>
                      <div className="ticket-item__actions">
                        {role === 'Kitchen' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              disabled={updatingItem === item.order_item_id}
                              onClick={() => updateItem(item, 'Ready')}
                            >
                              {updatingItem === item.order_item_id ? 'Saving…' : 'Mark ready'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger btn--sm"
                              disabled={updatingItem === item.order_item_id}
                              onClick={() => {
                                if (window.confirm(`Cancel ${item.menu_name}?`)) updateItem(item, 'Cancelled');
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            disabled={updatingItem === item.order_item_id}
                            onClick={() => updateItem(item, 'Served')}
                          >
                            {updatingItem === item.order_item_id ? 'Saving…' : 'Mark served'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <section className="workstation-empty">
            <span className="workstation-empty__mark" aria-hidden="true">✓</span>
            <h2>{loading ? 'Loading orders…' : 'All caught up'}</h2>
            <p>{loading ? 'Checking for active orders.' : 'New items will appear here automatically.'}</p>
          </section>
        )}
        <p className="workstation__hint">This board refreshes automatically every 10 seconds.</p>
      </main>
    </div>
  );
}
