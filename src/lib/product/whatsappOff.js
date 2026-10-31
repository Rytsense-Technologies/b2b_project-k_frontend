/**
 * Product notifications are email only (owner, Oct 2026).
 * Backend may still persist channel=whatsapp; portals hide it.
 */
export function isWhatsApp(value) {
  return String(value || '').trim().toLowerCase() === 'whatsapp';
}

export function withoutWhatsApp(list, pick) {
  const items = Array.isArray(list) ? list : [];
  if (!pick) return items.filter((item) => !isWhatsApp(item));
  return items.filter((item) => !isWhatsApp(pick(item)));
}

/** Delivery lists always ask for email so WhatsApp rows stay off the page. */
export function emailChannelQuery(channel) {
  if (!channel || isWhatsApp(channel)) return 'email';
  return channel;
}
