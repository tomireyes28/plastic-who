export function formatArsPrice(amount: number | null): string | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount < 0) return null;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}
