import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import CurrencyContext from './CurrencyContext';
const currencySymbols = { USD: '$', PKR: 'Rs', EUR: '€' };

export function CurrencyProvider({ children }) {
  const { user, updateCurrency } = useAuth();
  const userId = user?.id;
  const currency = user?.currency || 'USD';
  const [exchange, setExchange] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState('');
  const [currencyError, setCurrencyError] = useState('');

  const retryRates = useCallback(async () => {
    if (!userId) return;
    setRatesLoading(true);
    setRatesError('');
    try {
      const response = await api.get('/currency/rates');
      setExchange(response.data);
    } catch (error) {
      setExchange(null);
      setRatesError(error.response?.data?.message || 'Could not load currency conversion rates.');
    } finally {
      setRatesLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(retryRates, 0);
    return () => window.clearTimeout(timer);
  }, [retryRates]);

  const selectCurrency = useCallback(async nextCurrency => {
    setCurrencyError('');
    try {
      await updateCurrency(nextCurrency);
      return true;
    } catch (error) {
      setCurrencyError(error.response?.data?.message || 'Could not save your currency preference.');
      return false;
    }
  }, [updateCurrency]);

  const rates = exchange?.rates;
  const formatter = useMemo(() => new Intl.NumberFormat(currency === 'PKR' ? 'en-PK' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }), [currency]);

  const formatMoney = useCallback(value => {
    if (!rates) return '—';
    return formatter.format((Number(value) || 0) * rates[currency]);
  }, [currency, formatter, rates]);

  const convertToUSD = useCallback(value => {
    if (!rates) throw new Error('Currency conversion rates are not available.');
    return Math.round((Number(value) / rates[currency]) * 100) / 100;
  }, [currency, rates]);

  const convertFromUSD = useCallback(value => {
    if (!rates) return '';
    return Number(value) * rates[currency];
  }, [currency, rates]);

  const value = useMemo(() => ({
    currency,
    currencySymbol: currencySymbols[currency],
    rates,
    ratesLoading,
    ratesError,
    currencyError,
    ratesUpdatedAt: exchange?.updatedAt,
    staleRates: Boolean(exchange?.stale),
    formatMoney,
    convertToUSD,
    convertFromUSD,
    retryRates,
    selectCurrency
  }), [
    currency, rates, ratesLoading, ratesError, currencyError, exchange,
    formatMoney, convertToUSD, convertFromUSD, retryRates, selectCurrency
  ]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
