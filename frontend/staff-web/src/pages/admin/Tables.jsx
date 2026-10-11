import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  cancelAdminOrder, createAdminOrder, getAdminTableOrder,
  payAdminOrder, setAdminOrderCustomer,
} from '../../api';
import { formatTime } from '../../lib/format';
import BillPanel from '../../components/BillPanel';

export default function Tables() {
  const {
    token, tables, loadTables, bill, setBill, payment, setPayment,
    loading, run, setError, setNotice,
  } = useOutletContext();
  const [selected, setSelected] = useState([]);

  const counts = {
    free: tables.filter((t) => t.table_status !== 'Occupied').length,
    busy: tables.filter((t) => t.table_status === 'Occupied').length,
  };

  const openOccupied = (table) => run(async () => {
    setPayment(null);
    setBill(null);
    setBill(await getAdminTableOrder(table.table_number, token));
  });

  const toggle = (table) => setSelected((cur) => (cur.includes(table.table_id)
    ? cur.filter((id) => id !== table.table_id)
    : [...cur, table.table_id]));

  const startOrder = () => run(async () => {
    try {
      const created = await createAdminOrder(selected, token);
      setBill(created);
      setPayment(null);
      setSelected([]);
      await loadTables();
      setNotice(`Opened a bill for table${created.table_numbers.length === 1 ? '' : 's'} ${created.table_numbers.join(', ')}.`);
    } catch (err) {
      await loadTables().catch(() => {});
      throw err;
    }
  });

  const attach = (phone) => run(async () => {
    setBill(await setAdminOrderCustomer(bill.order_id, phone, token));
    setNotice('Member linked and discount applied.');
  });

  const pay = () => run(async () => {
    setPayment(await payAdminOrder(bill.order_id, token));
    setNotice('Payment completed.');
    await loadTables();
  });

  const cancel = () => {
    if (!window.confirm('Cancel this order?')) return;
    run(async () => {
      await cancelAdminOrder(bill.order_id, token);
      setBill(null);
      setPayment(null);
      setNotice('Order cancelled.');
      await loadTables();
    });
  };

  return (
    <div className={`split${bill ? ' has-aside' : ''}`}>
      <section className="split__main">
        <header className="page-head">
          <div>
            <h1 className="page-title">Tables</h1>
            <p className="muted">{counts.busy} occupied · {counts.free} available · refreshes every 30 seconds</p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => loadTables().catch((e) => setError(e.message))}>Refresh</button>
        </header>

        <div className="tables">
          {tables.map((table) => {
            const occupied = table.table_status === 'Occupied';
            const tone = occupied ? (table.time_alert || 'normal') : 'available';
            const isSelected = selected.includes(table.table_id);
            return (
              <button
                type="button"
                key={table.table_id}
                className={`tile is-${tone}${isSelected ? ' is-selected' : ''}`}
                onClick={() => (occupied ? openOccupied(table) : toggle(table))}
                aria-pressed={occupied ? undefined : isSelected}
              >
                <span className="tile__num">{table.table_number}</span>
                <span className="tile__meta">{table.capacity} seats</span>
                <span className="tile__state">
                  <i className="dot" />
                  {occupied ? `${table.minutes_seated ?? 0} min` : isSelected ? 'Selected' : 'Available'}
                </span>
                {occupied && <span className="tile__note">Leave by {formatTime(table.should_leave_at)}</span>}
                {table.upcoming_reservation && <span className="tile__note">Booked {formatTime(table.upcoming_reservation)}</span>}
              </button>
            );
          })}
          {!tables.length && !loading && <p className="empty">No tables found.</p>}
        </div>

        <div className={`dock${selected.length ? ' is-on' : ''}`}>
          <p>{selected.length ? `${selected.length} table${selected.length > 1 ? 's' : ''} selected` : 'Select available tables to open an order. Pick several to combine them.'}</p>
          <button type="button" className="btn btn--primary" disabled={!selected.length || loading} onClick={startOrder}>Open order</button>
        </div>
      </section>

      {bill && (
        <BillPanel
          key={bill.order_id}
          bill={bill}
          payment={payment}
          loading={loading}
          onClose={() => { setBill(null); setPayment(null); }}
          onAttach={attach}
          onPay={pay}
          onCancel={cancel}
        />
      )}
    </div>
  );
}
