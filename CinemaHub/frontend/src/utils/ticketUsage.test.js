import test from 'node:test';
import assert from 'node:assert/strict';
import { formatScanTime, getTicketScanDetails } from './ticketUsage.js';

const seat = (seatId, time, gate = 'Gate A', usageStatus = 'Used') => ({
  seatId, seatNumber: seatId, usageStatus,
  scanMetadata: { scannedAt: time, scannedByGate: gate },
});

test('latest scan follows time rather than seat order and retains the correct gate', () => {
  const old = seat('A1', '2026-10-20T18:55:00');
  const recent = seat('A2', '2026-10-20T19:00:00', 'Gate B');
  for (const seats of [[old, recent], [recent, old]]) {
    const before = structuredClone(seats);
    const result = getTicketScanDetails({ seats });
    assert.equal(result.latestScan.scannedAt, recent.scanMetadata.scannedAt);
    assert.equal(result.latestScan.scannedByGate, 'Gate B');
    assert.deepEqual(seats, before);
  }
});

test('unused-seat metadata and invalid dates cannot replace an actual used-seat scan', () => {
  const result = getTicketScanDetails({ seats: [
    seat('A1', '2026-10-20T18:55:00'),
    seat('A2', '2026-10-20T19:00:00', 'Gate B', 'Unused'),
    seat('A3', 'not-a-date'), null,
  ] });
  assert.equal(result.latestScan.scannedByGate, 'Gate A');
  assert.equal(result.seats.length, 3);
});

test('missing or malformed scan data has an explicit fallback', () => {
  for (const ticket of [null, {}, { seats: null }, { seats: [] }, { seats: [seat('A1', '')] }]) {
    assert.equal(getTicketScanDetails(ticket).latestScan, null);
  }
  for (const value of [null, undefined, '', ' ', 'broken', 0]) {
    assert.equal(formatScanTime(value), 'Chưa có thông tin');
  }
});

test('valid persisted scan timestamps are formatted for staff', () => {
  const value = '2026-10-20T19:00:00';
  assert.equal(formatScanTime(value), new Date(value).toLocaleString('vi-VN'));
});
