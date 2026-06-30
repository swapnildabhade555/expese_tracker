/**
 * Currency Exchange and Conversion Service
 * Integrates with Frankfurter API for live rates, with fallback rates for resilience.
 */

// Fallback rates relative to 1 INR (Base currency)
const exchangeRates = {
  INR: 1,
  USD: 0.012,  // 1 INR = 0.012 USD (approx 1 USD = 83.33 INR)
  EUR: 0.011,  // 1 INR = 0.011 EUR (approx 1 EUR = 90.91 INR)
  AUD: 0.018,  // 1 INR = 0.018 AUD (approx 1 AUD = 55.56 INR)
};

/**
 * Fetch latest exchange rates from Frankfurter API with INR as base.
 * Gracefully falls back to hardcoded rates on failure.
 */
export const loadExchangeRates = async () => {
  try {
    console.log('🔄 Fetching live exchange rates from Frankfurter API...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    const res = await fetch('https://api.frankfurter.app/latest?from=INR&to=USD,EUR,AUD', {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API responded with status: ${res.status}`);
    }

    const data = await res.json();
    if (data && data.rates) {
      exchangeRates.USD = data.rates.USD || exchangeRates.USD;
      exchangeRates.EUR = data.rates.EUR || exchangeRates.EUR;
      exchangeRates.AUD = data.rates.AUD || exchangeRates.AUD;
      console.log('✅ Successfully loaded live exchange rates:', JSON.stringify(data.rates));
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch live exchange rates. Using hardcoded fallback rates.', error.message);
  }
};

/**
 * Converts an amount from one currency to another.
 * @param {number|Decimal} amount - The financial value to convert
 * @param {string} fromCurrency - INR, USD, EUR, or AUD
 * @param {string} toCurrency - INR, USD, EUR, or AUD
 * @returns {number} The converted value rounded to 2 decimal places
 */
export const convertAmount = (amount, fromCurrency, toCurrency) => {
  const value = Number(amount);
  if (Number.isNaN(value) || value === 0) return 0;
  if (fromCurrency === toCurrency) return value;

  const fromRate = exchangeRates[fromCurrency];
  const toRate = exchangeRates[toCurrency];

  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency conversion from ${fromCurrency} to ${toCurrency}`);
  }

  // Convert from source currency to base (INR)
  const amountInBase = value / fromRate;

  // Convert from base (INR) to target currency
  const convertedAmount = amountInBase * toRate;

  return Number.parseFloat(convertedAmount.toFixed(2));
};

/**
 * Get a copy of the current active exchange rates map.
 */
export const getActiveRates = () => {
  return { ...exchangeRates };
};
