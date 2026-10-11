// Menu as customers see it: grouped by category. Discontinued items are hidden,
// sold-out items are shown so the page can grey them out.
const pool = require('../db');

async function getCustomerMenu() {
  const [rows] = await pool.query(
    `SELECT c.category_id, c.category_name, m.menu_id, m.menu_name, m.price, m.availability_status
       FROM menu m JOIN category c ON c.category_id = m.category_id
      WHERE m.availability_status <> 'Discontinued'
      ORDER BY c.category_id, m.menu_id`
  );

  const categories = new Map();
  for (const r of rows) {
    if (!categories.has(r.category_id)) {
      categories.set(r.category_id, { category_id: r.category_id, category_name: r.category_name, items: [] });
    }
    categories.get(r.category_id).items.push({
      menu_id: r.menu_id,
      menu_name: r.menu_name,
      price: r.price,
      availability_status: r.availability_status,
    });
  }
  return [...categories.values()];
}

module.exports = { getCustomerMenu };