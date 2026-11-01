const amount = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const valid = d => amount(d.subtotal) && amount(d.discountAmount) && amount(d.newTotal)
  && d.subtotal - d.discountAmount === d.newTotal && (d.code == null || typeof d.code === 'string');

/** An interrupted promo write is resolved from the saved booking, never replayed. */
export async function requestPromoChange({ base, token, bookingId, operation, code, subtotal, fetchImpl = fetch, timeoutMs = 15000 }) {
  const request = async (path, options) => {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(base + path, { ...options, signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } });
      const data = await response.json(); return { response, data };
    } finally { clearTimeout(timeout); }
  };
  if (operation !== 'recover') {
    try {
      const { response, data } = await request(operation === 'clear' ? `/bookings/${bookingId}/promo` : '/bookings/apply-promo',
        operation === 'clear' ? { method: 'DELETE' } : { method: 'POST', body: JSON.stringify({ bookingId, code, subtotal }) });
      if (!response.ok && response.status < 500 && response.status !== 408) {
        const error = new Error(data.error || 'Không thay đổi được mã khuyến mãi.'); error.definitive = true; throw error;
      }
      const normalized = { ...data, subtotal: operation === 'clear' ? data.subtotal : subtotal,
        code: operation === 'clear' ? null : data.code, newTotal: operation === 'clear' ? data.totalAmount : data.newTotal };
      if (response.ok && valid(normalized)) return { data: normalized };
    } catch (error) { if (error.definitive) throw error; }
  }
  try {
    const { response, data } = await request('/bookings/' + bookingId, { method: 'GET' });
    const b = data.booking;
    const normalized = b && { code: b.promoCode || null, subtotal: b.subtotal, discountAmount: b.discountAmount || 0, newTotal: b.totalAmount };
    if (response.ok && b?.id === bookingId && b.status === 'PENDING' && valid(normalized))
      return { data: normalized, reconciled: true };
  } catch { /* Keep the saved booking uncertain until a read succeeds. */ }
  return { uncertain: true };
}
