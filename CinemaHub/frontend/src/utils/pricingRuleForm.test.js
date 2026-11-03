import test from 'node:test';
import assert from 'node:assert/strict';
import { pricingRulePayload } from './pricingRuleForm.js';
const input = { trigger: 'WEEKEND', direction: 'increase', amount: '20000', status: 'Active', version: 3 };
test('pricing form submits signed VND adjustments and preserves optimistic revision', () => {
  assert.deepEqual(pricingRulePayload({ ...input, direction: 'decrease' }), { triggerVariable: 'WEEKEND', adjustmentValue: -20000, conditionParams: {}, status: 'Active', version: 3 });
});
test('changing rule category drops irrelevant previous conditions', () => {
  assert.deepEqual(pricingRulePayload({ ...input, dates: ['2030-01-01'], showtimeIds: ['s'], startHour: 22 }).conditionParams, {});
  assert.deepEqual(pricingRulePayload({ ...input, trigger: 'LATE_NIGHT', startHour: '0', dates: ['2030-01-01'] }).conditionParams, { startHour: 0 });
});
test('calendar selection produces unique sorted dates without CSV parsing', () => {
  assert.deepEqual(pricingRulePayload({ ...input, trigger: 'HOLIDAY', dates: ['2030-09-02', '2030-01-01', '2030-09-02'] }).conditionParams, { dates: ['2030-01-01', '2030-09-02'] });
});
test('showtime selection preserves IDs rather than display names', () => {
  assert.deepEqual(pricingRulePayload({ ...input, trigger: 'SNEAK_SHOW', showtimeIds: ['id-1', 'id-2', 'id-1'] }).conditionParams, { showtimeIds: ['id-1', 'id-2'] });
});
test('missing selections and invalid calendar dates are rejected', () => {
  for (const dates of [[], ['2030-02-30'], ['invalid']]) assert.throws(() => pricingRulePayload({ ...input, trigger: 'HOLIDAY', dates }));
  assert.throws(() => pricingRulePayload({ ...input, trigger: 'SNEAK_SHOW', showtimeIds: [] }));
  assert.throws(() => pricingRulePayload({ ...input, trigger: 'SNEAK_SHOW', showtimeIds: Array.from({ length: 367 }, (_, i) => 's-' + i) }));
});
test('adjustment entry uses positive whole amounts with an explicit direction', () => {
  for (const amount of ['', -1, 1.5, 1000001, Infinity, 'bad']) assert.throws(() => pricingRulePayload({ ...input, amount }));
  assert.equal(pricingRulePayload({ ...input, amount: 0 }).adjustmentValue, 0);
  assert.equal(pricingRulePayload({ ...input, amount: 1000000 }).adjustmentValue, 1000000);
});
test('hour selection and status must match the backend contract', () => {
  for (const startHour of ['', -1, 24, 1.5]) assert.throws(() => pricingRulePayload({ ...input, trigger: 'LATE_NIGHT', startHour }));
  assert.equal(pricingRulePayload({ ...input, status: 'Disabled' }).status, 'Disabled');
  assert.throws(() => pricingRulePayload({ ...input, status: 'unknown' }));
});
