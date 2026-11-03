export function formatArsPrice(amount: number | null): string | null {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}
