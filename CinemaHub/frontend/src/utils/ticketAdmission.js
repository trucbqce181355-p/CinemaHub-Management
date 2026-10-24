// An interrupted confirmation may already have committed. Recover with reads only.
export async function requestTicketAdmission({ base, token, code, expectedShowtimeId, operation, signal,
  fetchImpl = fetch, timeoutMs = 15000 }) {
  const post = async endpoint => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = setTimeout(abort, timeoutMs);
    try {
      const response = await fetchImpl(base + '/tickets/' + endpoint, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ code, expectedShowtimeId }),
      });
      const data = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid ticket response');
      return { response, data };
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  };
  if (operation === 'verify') return post('verify');
  if (operation === 'check-in') {
    try {
      const result = await post('check-in');
      const { response, data } = result;
      const complete = data?.code === 'CHECKED_IN' && data.usageStatus === 'USED'
        && data.ticket?.showtimeId === expectedShowtimeId && data.ticket.status === 'Used'
        && data.ticket.seats?.length > 0 && data.ticket.seats.every(seat => seat?.usageStatus === 'Used');
      if ((response.ok && complete) || (!response.ok && response.status < 500
        && response.status !== 408 && typeof data?.code === 'string')) return result;
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  // Both automatic recovery and the explicit retry only verify; never repeat the write.
  try {
    const result = await post('verify');
    const { response, data } = result;
    const used = response.status === 409 && data?.code === 'ALREADY_CHECKED_IN'
      && data.usageStatus === 'USED' && data.ticket?.showtimeId === expectedShowtimeId
      && data.ticket.seats?.length > 0 && data.ticket.seats.every(seat => seat?.usageStatus === 'Used');
    return { ...result, reconciled: used, uncertain: !used };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { uncertain: true, data: {} };
  }
}
