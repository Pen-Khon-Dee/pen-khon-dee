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
  if (!response.ok) throw new Error(data.error || 'Unable to complete your request.');
  return data;
}

export function getCustomerMenu() {
  return request('/customer/menu');
}

export function getAvailableTables() {
  return request('/customer/tables');
}

export function createCustomerOrder(table_number, items) {
  return request('/customer/orders', {
    method: 'POST',
    body: { table_number, items },
  });
}

export function addCustomerOrderItems(order, items) {
  return request(`/customer/orders/${order.order_id}/items`, {
    method: 'POST',
    body: { access_token: order.access_token, items },
  });
}
