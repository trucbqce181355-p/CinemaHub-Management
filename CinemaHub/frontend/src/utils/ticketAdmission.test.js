import test from 'node:test';
import assert from 'node:assert/strict';
import { requestTicketAdmission } from './ticketAdmission.js';

const ticket = { id: 'ticket', showtimeId: 'screening', status: 'Used', seats: [
  { usageStatus: 'Used', scanMetadata: { scannedAt: '2026-10-25T19:00', scannedByGate: 'Gate A' } },
] };
const used = { code: 'ALREADY_CHECKED_IN', usageStatus: 'USED', ticket };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });
const options = { base: '/api', token: 'token', code: 'QR', expectedShowtimeId: 'screening', operation: 'check-in' };

test('a confirmed write returns success without an additional database/API read', async () => {
  let calls = 0;
  const result = await requestTicketAdmission({ ...options, fetchImpl: async () => {
    calls++; return json({ ...used, code: 'CHECKED_IN' });
  } });
  assert.equal(calls, 1); assert.equal(result.data.code, 'CHECKED_IN');
});

for (const failure of ['network', 'timeout', '500', 'bad-json', 'invalid-success']) {
  test(`${failure} during confirmation is recovered with one read and no repeated write`, async () => {
    const calls = [];
    const result = await requestTicketAdmission({ ...options, timeoutMs: 10, fetchImpl: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
      if (calls.length > 1) return json(used, 409);
      if (failure === 'network') throw new TypeError('offline after commit');
      if (failure === 'timeout') return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError'))));
      if (failure === '500') return json({}, 500);
      if (failure === 'bad-json') return new Response('<html>');
      return json({ ticket });
    } });
    assert.deepEqual(calls.map(call => call.url), ['/api/tickets/check-in', '/api/tickets/verify']);
    assert.deepEqual(calls[0].body, calls[1].body);
    assert.equal(calls[1].headers.Authorization, 'Bearer token');
    assert.equal(result.reconciled, true); assert.deepEqual(result.data.ticket, ticket);
  });
}

test('business rejection is preserved without reconciliation or another write', async () => {
  let calls = 0;
  const result = await requestTicketAdmission({ ...options, fetchImpl: async () => {
    calls++; return json({ code: 'SHOWTIME_UNAVAILABLE' }, 409);
  } });
  assert.equal(calls, 1); assert.equal(result.data.code, 'SHOWTIME_UNAVAILABLE');
});

test('an unavailable recovery or an unused/partial/foreign ticket stays uncertain', async () => {
  for (const data of [null, { code: 'TICKET_VALID', ticket: { ...ticket, status: 'Paid' } },
    { ...used, ticket: { ...ticket, showtimeId: 'another' } },
    { ...used, ticket: { ...ticket, seats: [{ usageStatus: 'Unused' }] } }]) {
    let calls = 0;
    const result = await requestTicketAdmission({ ...options, fetchImpl: async () => {
      if (++calls === 1 || !data) throw new TypeError('offline');
      return json(data, data.code === 'ALREADY_CHECKED_IN' ? 409 : 200);
    } });
    assert.equal(calls, 2); assert.equal(result.uncertain, true); assert.notEqual(result.reconciled, true);
  }
});

test('explicit recovery uses verify only, even while the original write may still be processing', async () => {
  const urls = [];
  const result = await requestTicketAdmission({ ...options, operation: 'resolve', fetchImpl: async url => {
    urls.push(url); return json(used, 409);
  } });
  assert.deepEqual(urls, ['/api/tickets/verify']); assert.equal(result.reconciled, true);
});

test('malformed recovery bodies retain an uncertain outcome', async () => {
  for (const data of [null, [], 'invalid']) {
    const result = await requestTicketAdmission({ ...options, operation: 'resolve', fetchImpl: async () => json(data) });
    assert.equal(result.uncertain, true); assert.deepEqual(result.data, {});
  }
});

test('unmount cancellation aborts without starting reconciliation', async () => {
  const controller = new AbortController(); let calls = 0;
  await assert.rejects(requestTicketAdmission({ ...options, signal: controller.signal, fetchImpl: async () => {
    calls++; controller.abort(); throw new DOMException('unmount', 'AbortError');
  } }));
  assert.equal(calls, 1);
});
