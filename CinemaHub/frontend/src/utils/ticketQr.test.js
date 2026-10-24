import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTicketQrValue } from './ticketQr.js';

test('preserves the complete server-issued online and counter QR payloads', () => {
  for (const qrCode of ['CINEMAHUB|CH-261020-ABCD|token', 'CINEMAHUB|COUNTER|CH-261020-ABCD|token']) {
    assert.equal(getTicketQrValue({ id: 'PAY-ticket', qrCode }), qrCode);
  }
});
test('uses a real ticket ID for legacy tickets without a QR', () => {
  assert.equal(getTicketQrValue({ id: 'PAY-ticket' }), 'PAY-ticket');
  assert.equal(getTicketQrValue({ _id: '507f1f77bcf86cd799439011' }), '507f1f77bcf86cd799439011');
});
test('does not invent a QR for missing or incomplete ticket data', () => {
  assert.equal(getTicketQrValue(null), '');
  assert.equal(getTicketQrValue({ bookingReference: 'CH-261020-ABCD' }), '');
});
