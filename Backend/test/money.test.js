const test = require('node:test');
const assert = require('node:assert/strict');
const { fromMinorUnits, toMinorUnits } = require('../lib/money');
const { validAmount, validText, isObjectId } = require('../lib/validation');

test('money conversion preserves cent precision', () => {
    assert.equal(toMinorUnits(12.34), 1234);
    assert.equal(fromMinorUnits(1234), 12.34);
    assert.equal(fromMinorUnits(toMinorUnits(0.1) + toMinorUnits(0.2)), 0.3);
});

test('amount validation accepts bounded dollar values with at most two decimals', () => {
    assert.equal(validAmount(0.01), true);
    assert.equal(validAmount(100000000), true);
    assert.equal(validAmount(0.001), false);
    assert.equal(validAmount('12.50'), false);
    assert.equal(validAmount(Infinity), false);
    assert.equal(validAmount(0), false);
});

test('text and Mongo id validation reject malformed input', () => {
    assert.equal(validText('  groceries ', 40), true);
    assert.equal(validText('  ', 40), false);
    assert.equal(validText('a'.repeat(41), 40), false);
    assert.equal(isObjectId('507f1f77bcf86cd799439011'), true);
    assert.equal(isObjectId('not-an-id'), false);
});
