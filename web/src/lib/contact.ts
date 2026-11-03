export const CONTACT_REASONS = [
  'Sugerir una tienda', 'Corregir composición', 'Consulta sobre semáforo', 'Otro comentario',
] as const;

export interface ContactMessage { name: string; email: string; reason: string; message: string }

export function parseContact(body: unknown): ContactMessage | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  if (typeof value.name !== 'string' || typeof value.email !== 'string' || typeof value.message !== 'string') return null;
  if (value.reason !== undefined && typeof value.reason !== 'string') return null;
  const name = value.name.trim(), email = value.email.trim(), message = value.message.trim();
  const reason = typeof value.reason === 'string' ? value.reason.trim() : 'Otro comentario';
  if (!name || name.length > 100 || !message || message.length > 4000 || email.length > 254) return null;
  if (/[\r\n\x00-\x1f\x7f]/.test(name + email + reason) || message.includes('\0')) return null;
  if (!/^[^\s<>"'@]+@[^\s<>"'@]+\.[^\s<>"'@]+$/.test(email)) return null;
  if (!(CONTACT_REASONS as readonly string[]).includes(reason)) return null;
  return { name, email, reason, message };
}

export function escapeContactHtml(text: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, char => entities[char]);
}
