const currencies = ['USD', 'PKR', 'EUR'];
const cacheDurationMs = 6 * 60 * 60 * 1000;
let cachedRates;
let cacheExpiresAt = 0;
let cachedRatesAreStale = false;
let refreshInProgress;

function parseExchangeRates(data) {
    if (data?.result !== 'success' || data.base_code !== 'USD' || !data.rates) {
        throw new Error('The exchange-rate provider returned an invalid response.');
    }

    const rates = Object.fromEntries(currencies.map(currency => {
        const rate = data.rates[currency];
        if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
            throw new Error(`The exchange-rate provider returned an invalid ${currency} rate.`);
        }
        return [currency, rate];
    }));

    return {
        base: 'USD',
        rates,
        updatedAt: data.time_last_update_utc || null
    };
}

async function getExchangeRates() {
    if (cachedRates && Date.now() < cacheExpiresAt) {
        return { ...cachedRates, stale: cachedRatesAreStale };
    }
    if (refreshInProgress) return refreshInProgress;

    refreshInProgress = (async () => {
        try {
            const response = await fetch('https://open.er-api.com/v6/latest/USD', {
                signal: AbortSignal.timeout(6000)
            });
            if (!response.ok) throw new Error(`Exchange-rate provider returned HTTP ${response.status}.`);

            cachedRates = parseExchangeRates(await response.json());
            cacheExpiresAt = Date.now() + cacheDurationMs;
            cachedRatesAreStale = false;
            return { ...cachedRates, stale: false };
        } catch (cause) {
            if (cachedRates) {
                cachedRatesAreStale = true;
                cacheExpiresAt = Date.now() + 60 * 1000;
                return { ...cachedRates, stale: true };
            }
            const error = new Error('Currency rates are temporarily unavailable. Please try again later.');
            error.status = 503;
            error.cause = cause;
            throw error;
        } finally {
            refreshInProgress = null;
        }
    })();

    return refreshInProgress;
}

module.exports = { getExchangeRates, parseExchangeRates };
