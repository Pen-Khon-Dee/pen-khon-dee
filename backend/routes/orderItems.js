const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { withTransaction, httpError, recalcTotals, getBill, lockOpenOrder } = require('../services/orders');

const router = express.Router();

// Who may move an item to which status, and from which status:
//   Kitchen : Pending -> Ready      (dish is cooked)
//   Kitchen : Pending -> Cancelled  (cannot be made, e.g. sold out)
//   Server  : Ready   -> Served     (dish is on the table)
//   Cashier : Pending -> Cancelled  (customer changed their mind at the counter)
const ALLOWED = {
  Kitchen: { Ready: ['Pending'], Cancelled: ['Pending'] },
  Server: { Served: ['Ready'] },
  Cashier: { Cancelled: ['Pending'] },
};

// PATCH /api/order-items/:id : change an item's status (Kitchen, Server, Cashier). Returns the updated bill.
router.patch('/:id', requireAuth, requireRole('Kitchen', 'Server', 'Cashier'), async (req, res, next) => {
  try {
    const status = req.body?.item_status;
    if (!['Ready', 'Served', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'item_status must be Ready, Served or Cancelled' });
    }
    const fromStatuses = ALLOWED[req.user.role][status];
    if (!fromStatuses) {
      return res.status(403).json({ error: `A ${req.user.role} cannot mark items as ${status}` });
    }

    const bill = await withTransaction(async (conn) => {
      const [[item]] = await conn.query(
        'SELECT order_item_id, order_id, item_status FROM order_item WHERE order_item_id = ?',
        [req.params.id]
      );
      if (!item) throw httpError(404, 'Order item not found');

      await lockOpenOrder(conn, item.order_id);
      // Re-read under the lock so two people cannot change the same item at once
      const [[current]] = await conn.query(
        'SELECT item_status FROM order_item WHERE order_item_id = ? FOR UPDATE', [item.order_item_id]
      );
      if (!fromStatuses.includes(current.item_status)) {
        throw httpError(409, `This item is already ${current.item_status}`);
      }

      await conn.query(
        'UPDATE order_item SET item_status = ? WHERE order_item_id = ?',
        [status, item.order_item_id]
      );
      if (status === 'Cancelled') await recalcTotals(conn, item.order_id);
      return getBill(conn, item.order_id);
    });

    res.json(bill);
  } catch (err) {
    next(err);
  }
});

module.exports = router;