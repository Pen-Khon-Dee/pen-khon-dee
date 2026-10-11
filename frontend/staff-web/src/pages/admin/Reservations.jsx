import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  createAdminCustomer, createAdminOrder, createAdminReservation,
  getAdminReservations, setAdminReservationStatus,
} from '../../api';
import useCustomerSearch from '../../hooks/useCustomerSearch';
import { formatTime, reservationStatusLabel, today } from '../../lib/format';
import { Labeled } from '../../components/Field';

export default function Reservations() {
  const navigate = useNavigate();
  const {
    token, tables, loadTables, setBill, setPayment, loading, run, setError, setNotice,
  } = useOutletContext();

  const [date, setDate] = useState(today);
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const search = useCustomerSearch({ token, run, setError });
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [bookingDate, setBookingDate] = useState(today);
  const [bookingTime, setBookingTime] = useState('18:00');
  const [guests, setGuests] = useState('2');
  const [tableIds, setTableIds] = useState([]);

  const load = useCallback(async (d) => {
    setRows(await getAdminReservations(d, token));
  }, [token]);

  useEffect(() => {
    load(date).catch((err) => setError(err.message));
  }, [date, load, setError]);

  const addCustomer = () => run(async () => {
    search.setCustomer(await createAdminCustomer({
      name: newName.trim(),
      phone: search.phone.trim(),
      ...(newEmail.trim() ? { email: newEmail.trim() } : {}),
    }, token));
    search.setNotFound(false);
    setNotice('Customer added.');
  });

  const submit = (event) => {
    event.preventDefault();
    if (!search.customer || !tableIds.length) {
      setError('Find or add a customer and select at least one table.');
      return;
    }
    run(async () => {
      await createAdminReservation({
        customer_id: search.customer.customer_id,
        reservation_datetime: `${bookingDate} ${bookingTime}:00`,
        number_of_guests: Number(guests),
        table_ids: tableIds,
      }, token);
      search.reset();
      search.setPhone('');
      setNewName('');
      setNewEmail('');
      setTableIds([]);
      setFormOpen(false);
      await Promise.all([load(date), loadTables()]);
      setNotice('Reservation created.');
    });
  };

  const change = async (row, status) => {
    setBusyId(row.reservation_id);
    setError('');
    setNotice('');
    try {
      const updated = await setAdminReservationStatus(row.reservation_id, status, token);
      if (status === 'Seated') {
        const opened = await createAdminOrder(updated.table_ids, token);
        setBill(opened);
        setPayment(null);
        await loadTables();
        await load(date);
        setNotice(`Reservation #${row.reservation_id} checked in. Opened a bill for table${updated.table_numbers.length === 1 ? '' : 's'} ${updated.table_numbers.join(', ')}.`);
        navigate('/admin/tables');
        return;
      }
      await load(date);
      setNotice(`Reservation #${row.reservation_id} updated.`);
    } catch (err) {
      setError(err.message);
      await Promise.all([load(date), loadTables()]).catch((e) => setError(`${err.message} · Refresh failed: ${e.message}`));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="narrow narrow--wide">
      <header className="page-head">
        <h1 className="page-title">Reservations</h1>
        <div className="page-head__actions">
          <label className="date-pick">
            <span className="sr-only">Date</span>
            <input className="field__control" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <button type="button" className="btn btn--primary" onClick={() => setFormOpen((v) => !v)} aria-expanded={formOpen}>
            {formOpen ? 'Close' : 'New reservation'}
          </button>
        </div>
      </header>

      {formOpen && (
        <form className="card form" onSubmit={submit}>
          <h2 className="card__title">New reservation</h2>
          <div className="inline-form">
            <Labeled label="Customer phone number">
              <input className="field__control" type="tel" value={search.phone} onChange={(e) => search.changePhone(e.target.value)} required />
            </Labeled>
            <button type="button" className="btn btn--ghost" disabled={loading} onClick={search.search}>Find customer</button>
          </div>
          {search.customer && <p className="chip-line">{search.customer.name} · {search.customer.phone}</p>}
          {search.notFound && (
            <div className="subform">
              <p className="muted">No customer with this number. Add their details first.</p>
              <Labeled label="Name"><input className="field__control" value={newName} onChange={(e) => setNewName(e.target.value)} /></Labeled>
              <Labeled label="Email (optional)"><input className="field__control" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></Labeled>
              <button type="button" className="btn btn--ghost" disabled={loading || !newName.trim()} onClick={addCustomer}>Add customer</button>
            </div>
          )}
          <div className="grid-3">
            <Labeled label="Date"><input className="field__control" type="date" min={today()} value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} required /></Labeled>
            <Labeled label="Time"><input className="field__control" type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} required /></Labeled>
            <Labeled label="Guests"><input className="field__control" type="number" min="1" max="255" value={guests} onChange={(e) => setGuests(e.target.value)} required /></Labeled>
          </div>
          <fieldset className="picker">
            <legend>Tables</legend>
            {tables.map((table) => {
              const on = tableIds.includes(table.table_id);
              return (
                <label key={table.table_id} className={`picker__item${on ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setTableIds((cur) => (on ? cur.filter((id) => id !== table.table_id) : [...cur, table.table_id]))}
                  />
                  <b>{table.table_number}</b>
                  <span>{table.capacity} seats</span>
                </label>
              );
            })}
          </fieldset>
          <button type="submit" className="btn btn--primary" disabled={loading || !search.customer || !tableIds.length}>Create reservation</button>
        </form>
      )}

      <ul className="rows">
        {rows.map((row) => {
          const confirmed = row.reservation_status === 'Confirmed';
          const late = confirmed && row.late_minutes > 0;
          return (
            <li className="row" key={row.reservation_id}>
              <span className="row__time">{formatTime(row.reservation_datetime)}</span>
              <div className="row__main">
                <p className="row__title">{row.customer?.name || 'No name'}</p>
                <p className="muted">
                  {row.customer?.phone || '—'} · {row.number_of_guests} guests · Table {row.table_numbers?.join(', ') || '—'}
                </p>
                {late && <p className={row.late_minutes > 30 ? 'late is-overdue' : 'late'}>{row.late_minutes} min late</p>}
              </div>
              <span className={`status ${confirmed ? 'is-ok' : 'is-muted'}`}>{reservationStatusLabel(row.reservation_status)}</span>
              {confirmed && (
                <div className="row__actions">
                  <button type="button" className="btn btn--primary btn--sm" disabled={busyId === row.reservation_id} onClick={() => change(row, 'Seated')}>Check in</button>
                  <button type="button" className="btn btn--ghost btn--sm" disabled={busyId === row.reservation_id} onClick={() => change(row, 'Cancelled')}>Cancel</button>
                  {row.late_minutes > 30 && (
                    <button type="button" className="btn btn--ghost btn--sm btn--danger" disabled={busyId === row.reservation_id} onClick={() => change(row, 'No-show')}>No-show</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {!rows.length && !loading && <li className="empty">No reservations on this date.</li>}
      </ul>
    </div>
  );
}
