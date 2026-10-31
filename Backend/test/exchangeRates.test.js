const test = require('node:test');
const assert = require('node:assert/strict');
const { parseExchangeRates } = require('../lib/exchangeRates');

test('exchange rates include only supported currencies based on USD', () => {
    const result = parseExchangeRates({
        result: 'success',
        base_code: 'USD',
        time_last_update_utc: 'Fri, 30 Oct 2026 00:02:31 +0000',
        rates: { USD: 1, PKR: 280.5, EUR: 0.89, GBP: 0.75 }
    });

    assert.deepEqual(result, {
        base: 'USD',
        rates: { USD: 1, PKR: 280.5, EUR: 0.89 },
        updatedAt: 'Fri, 30 Oct 2026 00:02:31 +0000'
    });
});

test('exchange rates reject unsupported or invalid provider responses', () => {
    assert.throws(() => parseExchangeRates({ result: 'error' }));
    assert.throws(() => parseExchangeRates({
        result: 'success',
        base_code: 'EUR',
        rates: { USD: 1, PKR: 280, EUR: 0.89 }
    }));
    assert.throws(() => parseExchangeRates({
        result: 'success',
        base_code: 'USD',
        rates: { USD: 1, PKR: 0, EUR: 0.89 }
    }));
});
