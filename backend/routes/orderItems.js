const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { withTransaction, httpError, recalcTotals, getBill, lockOpenOrder } = require('../services/orders');

const router = express.Router();

// PATCH /api/order-items/:id : mark an item Served or Cancelled (Server)
// Only Pending items can change. Returns the updated bill.
router.patch('/:id', requireAuth, requireRole('Server'), async (req, res, next) => {
  try {
    const status = req.body?.item_status;
    if (!['Served', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'item_status must be Served or Cancelled' });
    }

    const bill = await withTransaction(async (conn) => {
      const [[item]] = await conn.query(
        'SELECT order_item_id, order_id, item_status FROM order_item WHERE order_item_id = ?',
        [req.params.id]
      );
      if (!item) throw httpError(404, 'Order item not found');

      await lockOpenOrder(conn, item.order_id);
      if (item.item_status !== 'Pending') {
        throw httpError(409, `This item is already ${item.item_status}`);
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