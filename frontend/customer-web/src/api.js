
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function request(path, { method = 'GET', body } = {}) {
  let response;

  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Unable to connect to the ordering service. Please try again.');
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error('The ordering service returned an invalid response.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Unable to complete your request.');
  }

  return data;
}

export async function getCustomerMenu() {
  const categories = await request('/menu/public');

  return categories.flatMap((category) =>
    category.items.map((item) => ({
      ...item,
      category_id: category.category_id,
      category_name: category.category_name,
    }))
  );
}

export function getAvailableTables() {
  return request('/qr/tables');
}

export function getTableMenu(token) {
  return request(`/qr/${encodeURIComponent(token)}/menu`);
}

export function getCustomerOrder(token) {
  return request(`/qr/${encodeURIComponent(token)}`);
}

export function createCustomerOrder(qr_token, items) {
  return request(`/qr/${encodeURIComponent(qr_token)}/items`, {
    method: 'POST',
    body: { items },
  });
}

export function addCustomerOrderItems(order, items) {
  return request(`/qr/${encodeURIComponent(order.qr_token)}/items`, {
    method: 'POST',
    body: { items },
  });
}
