export const baht = (amount) => `฿${Number(amount).toLocaleString('en-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
