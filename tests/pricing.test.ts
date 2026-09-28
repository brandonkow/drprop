import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateFee } from '../src/features/fee-calculator.ts';
import { whatsappUrl } from '../src/features/whatsapp.ts';
test('all five bands, exact upper boundaries and the next cent', () => {
  for (const [amount, fee] of [
    ['0.01', 199], ['300000', 199], ['300000.01', 399],
    ['600000', 399], ['600000.01', 699], ['1000000', 699],
    ['1000000.01', 1199], ['2000000', 1199], ['2000000.01', 1999], ['5000000', 1999],
    [' 500,000.00 ', 399],
  ] as const) assert.deepEqual(calculateFee(amount), { state: 'valid', fee });
});
test('empty and malformed amounts never show a fee', () => {
  for (const input of ['', '   ']) assert.deepEqual(calculateFee(input), { state: 'empty' });
  for (const input of ['0', '-1', 'abc', '12,34', '1e6', 'Infinity', '1.001', '.5', 'RM 500', '9'.repeat(30)]) {
    assert.deepEqual(calculateFee(input), { state: 'invalid' }, input);
  }
});
test('booking stays unavailable without a real-format number; message is encoded', () => {
  assert.equal(whatsappUrl(null, 'hello'), null);
  assert.equal(whatsappUrl('60XXXXXXXXX', 'hello'), null);
  assert.equal(new URL(whatsappUrl('60123456789', 'Consultation & questions')!).searchParams.get('text'), 'Consultation & questions');
});
