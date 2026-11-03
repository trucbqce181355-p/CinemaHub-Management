import test from 'node:test';
import assert from 'node:assert/strict';
import { previewPromotion, promotionPayload } from './promotionForm.js';

const form = () => ({ code: ' giam20% ', title: ' Ưu đãi 20% ', description: '', discountType: 'Percentage', discountValue: '20', startDate: '2026-11-01T09:00', endDate: '2026-11-30T23:00', status: 'Active', bannerImage: '', conditions: { minSpend: '200000', maxDiscount: '50000' }, version: 3 });

test('normalizes code and numeric conditions while keeping version', () => {
  const result = promotionPayload(form());
  assert.equal(result.code, 'GIAM20%');
  assert.equal(result.title, 'Ưu đãi 20%');
  assert.equal(result.discountValue, 20);
  assert.deepEqual(result.conditions, { minSpend: 200000, maxDiscount: 50000 });
  assert.equal(result.version, 3);
});
test('preserves membership voucher conditions on edit', () => {
  const result = promotionPayload({ ...form(), conditions: { redeemedByUserId: 'u1', rewardVoucherId: 'v1', usageLimit: '' } });
  assert.deepEqual(result.conditions, { redeemedByUserId: 'u1', rewardVoucherId: 'v1' });
});
test('rejects invalid discount, dates, and usage limits', () => {
  assert.throws(() => promotionPayload({ ...form(), discountValue: 101 }), /100/);
  assert.throws(() => promotionPayload({ ...form(), endDate: '2026-10-31T09:00' }), /sau/);
  assert.throws(() => promotionPayload({ ...form(), conditions: { usageLimit: '1.5' } }), /số nguyên/);
  assert.throws(() => promotionPayload({ ...form(), discountType: 'Fixed', discountValue: 1000000001 }), /số nguyên/);
});
test('preview applies threshold, cap, and subtotal ceiling', () => {
  assert.deepEqual(previewPromotion(form(), 100000), { discount: 0, total: 100000, eligible: false });
  assert.deepEqual(previewPromotion(form(), 300000), { discount: 50000, total: 250000, eligible: true });
  assert.deepEqual(previewPromotion({ ...form(), discountType: 'Fixed', discountValue: 500000, conditions: {} }, 100000), { discount: 100000, total: 0, eligible: true });
});
