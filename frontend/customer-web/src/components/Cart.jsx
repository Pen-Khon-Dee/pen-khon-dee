import { useEffect } from 'react';
import { baht } from '../lib/format';

export default function Cart({
  open, onClose, items, total, hasOrder, canOrder, submitting, loading,
  onQuantity, onNote, onSubmit,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`scrim${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`cart${open ? ' is-open' : ''}`} aria-label="Your order">
        <div className="cart__head">
          <h2>Your order</h2>
          <button type="button" className="text-button cart__close" onClick={onClose}>Close</button>
        </div>

        {!items.length ? (
          <p className="cart__empty">Nothing here yet. Add dishes from the menu.</p>
        ) : (
          <>
            <ul className="cart__list">
              {items.map((item) => (
                <li key={item.menu_id} className="line">
                  <div className="line__top">
                    <div>
                      <p className="line__name">{item.menu_name}</p>
                      <p className="line__sub">{baht(item.price)} each</p>
                    </div>
                    <div className="qty qty--sm" role="group" aria-label={`Quantity of ${item.menu_name}`}>
                      <button type="button" onClick={() => onQuantity(item, -1)} aria-label={`Remove one ${item.menu_name}`}>−</button>
                      <output>{item.quantity}</output>
                      <button type="button" onClick={() => onQuantity(item, 1)} aria-label={`Add one ${item.menu_name}`}>+</button>
                    </div>
                  </div>
                  <input
                    className="line__note"
                    value={item.note}
                    maxLength={255}
                    onChange={(e) => onNote(item.menu_id, e.target.value)}
                    placeholder="Note for the kitchen"
                    aria-label={`Note for ${item.menu_name}`}
                  />
                  <p className="line__total">{baht(Number(item.price) * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="cart__total">
              <span>Subtotal</span>
              <strong>{baht(total)}</strong>
            </div>
            <p className="cart__note">Pay at the counter when you’re done.</p>
            <button type="button" className="submit" onClick={onSubmit} disabled={submitting || loading || !canOrder}>
              {submitting ? 'Sending…' : hasOrder ? 'Send more dishes' : 'Place order'}
            </button>
            {!canOrder && <p className="cart__hint">Choose a table to place your order.</p>}
          </>
        )}
      </aside>
    </>
  );
}
