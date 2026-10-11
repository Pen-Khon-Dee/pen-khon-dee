const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Unable to connect to the API. Please make sure the backend is running.');
  }
  let data;
  try {
    data = await res.json();
  } catch {
    if (!res.ok && res.status >= 500) {
      throw new Error('The API is unavailable. Please start the backend and check its database connection.');
    }
    throw new Error('The API returned an invalid response.');
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || 'An error occurred. Please try again.');
  }
  return data;
}

/* ---------- Admin API ---------- */
export function adminLogin({ identifier, password }) {
  const key = identifier.includes('@') ? 'email' : 'username';
  return request('/auth/login', {
    method: 'POST',
    body: { [key]: identifier, password },
  });
}

export function getAdminSession(token) {
  return request('/auth/me', { token });
}

export function getKitchenBoard(token) {
  return request('/kitchen/board', { token });
}

export function setOrderItemStatus(id, item_status, token) {
  return request(`/order-items/${id}`, {
    method: 'PATCH', body: { item_status }, token,
  });
}

export function getAdminCategories(token) {
  return request('/categories', { token });
}

export function getAdminMenu(token) {
  return request('/menu?include_discontinued=true', { token });
}

export function addAdminMenuItem(payload, token) {
  return request('/menu', { method: 'POST', body: payload, token });
}

export function setAdminMenuAvailability(id, availability_status, token) {
  return request(`/menu/${id}/availability`, {
    method: 'PATCH', body: { availability_status }, token,
  });
}

export function updateAdminMenuItem(id, payload, token) {
  return request(`/menu/${id}`, { method: 'PUT', body: payload, token });
}

export function addAdminCategory(category_name, token) {
  return request('/categories', { method: 'POST', body: { category_name }, token });
}

export function renameAdminCategory(id, category_name, token) {
  return request(`/categories/${id}`, { method: 'PUT', body: { category_name }, token });
}

export function getAdminReservations(date, token) {
  return request(`/reservations?date=${encodeURIComponent(date)}`, { token });
}

export function createAdminReservation(payload, token) {
  return request('/reservations', { method: 'POST', body: payload, token });
}

export function setAdminReservationStatus(id, reservation_status, token) {
  return request(`/reservations/${id}`, {
    method: 'PATCH', body: { reservation_status }, token,
  });
}

export function getAdminCustomer(phone, token) {
  return request(`/customers?phone=${encodeURIComponent(phone)}`, { token });
}

export function createAdminCustomer(payload, token) {
  return request('/customers', { method: 'POST', body: payload, token });
}

export function enrollAdminMember(customer_id, token) {
  return request('/members', { method: 'POST', body: { customer_id }, token });
}

export function getAdminTables(token) {
  return request('/tables', { token });
}

export function createAdminOrder(table_ids, token) {
  return request('/orders', { method: 'POST', body: { table_ids }, token });
}

export function getAdminTableOrder(tableNumber, token) {
  return request(`/tables/${tableNumber}/order`, { token });
}

export function setAdminOrderCustomer(id, phone, token) {
  return request(`/orders/${id}/customer`, { method: 'PATCH', body: { phone }, token });
}

export function payAdminOrder(id, token) {
  return request(`/orders/${id}/pay`, { method: 'POST', token });
}

export function cancelAdminOrder(id, token) {
  return request(`/orders/${id}/cancel`, { method: 'POST', token });
}
