export const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export const baht = (value) => `฿${Number(value).toLocaleString('en-TH')}`;

export const formatTime = (value) => (value
  ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  : '—');

export const reservationStatusLabel = (status) => ({
  Confirmed: 'Confirmed',
  Seated: 'Seated',
  Cancelled: 'Cancelled',
  'No-show': 'No-show',
}[status] || status);
