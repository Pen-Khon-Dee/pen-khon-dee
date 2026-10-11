export const ORDER_STORAGE_KEY = 'pen-khon-dee-customer-order';

export function readOrderSession() {
  try {
    const value = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY));
    if (
      Number.isInteger(value?.order_id)
      && Number.isInteger(value?.table_number)
      && /^[a-f0-9]{64}$/.test(value?.access_token || '')
    ) return value;
  } catch {
    localStorage.removeItem(ORDER_STORAGE_KEY);
  }
  return null;
}

export const saveOrderSession = (session) => localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(session));
export const clearOrderSession = () => localStorage.removeItem(ORDER_STORAGE_KEY);
