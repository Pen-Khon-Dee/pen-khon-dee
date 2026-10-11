import { useState } from 'react';
import { baht } from '../lib/format';
import { Labeled } from './Field';

export default function BillPanel({ bill, payment, loading, onClose, onAttach, onPay, onCancel }) {
  const [phone, setPhone] = useState('');
  const activeItems = bill.items?.filter((row) => row.item_status !== 'Cancelled') || [];
  const canCancel = !payment && !bill.items?.some((row) => row.item_status === 'Served');

  return (
    <aside className="bill" aria-labelledby="bill-title">
      <header className="bill__head">
        <div>
          <h2 id="bill-title" className="bill__title">Table {bill.table_numbers?.join(', ')}</h2>
          <p className="muted">Order #{bill.order_id}</p>
        </div>
        <button type="button" className="link-button" onClick={onClose}>Close</button>
      </header>

      <ul className="bill__items">
        {bill.items?.map((row) => (
          <li key={row.order_item_id} className={row.item_status === 'Cancelled' ? 'is-cancelled' : ''}>
            <span className="bill__qty">{row.quantity}</span>
            <span className="bill__name">
              {row.menu_name}
              {row.note && <small>{row.note}</small>}
            </span>
            <span className="bill__price">{baht(row.subtotal)}</span>
            <span className="bill__state">{row.item_status}</span>
          </li>
        ))}
        {!bill.items?.length && <li className="empty">No items on this bill yet.</li>}
      </ul>

      <dl className="bill__totals">
        <div><dt>Subtotal</dt><dd>{baht(bill.items_total)}</dd></div>
        <div><dt>Discount</dt><dd>−{baht(bill.discount_amount)}</dd></div>
        <div className="is-grand"><dt>Amount due</dt><dd>{baht(bill.total_amount)}</dd></div>
      </dl>

      <p className="bill__member">
        {bill.customer ? `${bill.customer.name} · ${bill.customer.member_level || 'Member'}` : 'No member linked'}
      </p>

      {!payment && (
        <form
          className="bill__member-form"
          onSubmit={(e) => { e.preventDefault(); onAttach(phone.trim()); }}
        >
          <Labeled label="Member phone number">
            <input className="field__control" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Labeled>
          <button type="submit" className="btn btn--ghost" disabled={loading}>Link member</button>
        </form>
      )}

      {payment && (
        <div className="bill__paid" role="status">
          <strong>Payment received · {baht(payment.total_amount)}</strong>
          {payment.current_points != null && (
            <p>Earned {payment.points_earned} points · Balance {payment.current_points} points</p>
          )}
          {payment.level_up && <p>Membership upgraded to {payment.member_level}.</p>}
        </div>
      )}

      {!payment && (
        <div className="bill__actions">
          <button type="button" className="btn btn--primary btn--block" disabled={loading || !activeItems.length} onClick={onPay}>
            Mark as paid
          </button>
          {canCancel && (
            <button type="button" className="link-button link-button--danger" disabled={loading} onClick={onCancel}>
              Cancel order
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
