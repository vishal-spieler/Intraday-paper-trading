// Live market data API service
import { generateMockCandles, generateHistoricalData, getAvailableDates } from './mockDataGenerator';

const API_BASE_URL = 'http://localhost:3001/api';

// Symbol token mapping - update these with your actual tokens
const SYMBOL_TOKENS = {
  'NIFTY': '99926000',
  'BANKNIFTY': '99926000'
};

// Futures token mapping for volume data
// Update these with the actual tokens for the nearest expiry futures
const FUTURES_TOKENS = {
  'NIFTY': '99926001', // Example: NIFTY Jan Fut
  'BANKNIFTY': '99926002' // Example: BANKNIFTY Jan Fut
};

// Cache mock data to maintain consistency across calls if API fails
let cachedHistoricalData = null;
let lastSymbol = null;

const getCachedMockData = (symbol) => {
  if (!cachedHistoricalData || lastSymbol !== symbol) {
    cachedHistoricalData = generateHistoricalData(symbol, 30); // Generate 30 days of history
    lastSymbol = symbol;
  }
  return cachedHistoricalData;
};

export async function fetchLiveCandles(symbol) {
  const symbolToken = SYMBOL_TOKENS[symbol];
  const futureToken = FUTURES_TOKENS[symbol];

  if (!symbolToken) {
    throw new Error(`No token configured for symbol: ${symbol}`);
  }

  try {
    // 1. Fetch Index Data (Price)
    const response = await fetch(`${API_BASE_URL}/candles?symbolToken=${symbolToken}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
    const indexData = await response.json();

    let candles = indexData.map(item => ({
      time: new Date(item.timestamp || item.time || item.date).toISOString(),
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume || 0)
    }));

    // 2. Fetch Future Data (Volume) if token exists
    if (futureToken) {
      try {
        const futResponse = await fetch(`${API_BASE_URL}/candles?symbolToken=${futureToken}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (futResponse.ok) {
          const futData = await futResponse.json();
          // Create a map of time -> volume
          const volMap = new Map();
          futData.forEach(item => {
            const time = new Date(item.timestamp || item.time || item.date).toISOString();
            volMap.set(time, parseFloat(item.volume || 0));
          });

          // Merge volume into candles
          candles = candles.map(c => ({
            ...c,
            volume: volMap.get(c.time) || c.volume || 0
          }));
        }
      } catch (warn) {
        console.warn('Failed to fetch future volume:', warn);
      }
    }

    return candles;
  } catch (error) {
    console.warn('API fetch failed, falling back to mock data:', error);
    // Fallback to mock data
    return generateMockCandles(symbol, 78);
  }
}

export async function fetchHistoricalCandles(symbol, date) {
  const symbolToken = SYMBOL_TOKENS[symbol];

  if (!symbolToken) {
    throw new Error(`No token configured for symbol: ${symbol}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/candles?symbolToken=${symbolToken}&date=${date}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform API response to our candle format
    return data.map(item => ({
      time: new Date(item.timestamp || item.time || item.date).toISOString(),
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume || 0)
    }));
  } catch (error) {
    console.warn('API fetch failed, falling back to mock data:', error);

    // Fallback to mock data
    const historicalData = getCachedMockData(symbol);
    const dateKey = date.includes('T') ? date.split('T')[0] : date;
    const data = historicalData[dateKey];

    if (!data) {
      // If no mock data for date, try regenerating or generic fallback
      // For now, return empty or throw if critical
      throw new Error(`No data found for date: ${date} (Offline Mode)`);
    }
    return data;
  }
}

export async function fetchAvailableDates(symbol) {
  const symbolToken = SYMBOL_TOKENS[symbol];

  if (!symbolToken) {
    throw new Error(`No token configured for symbol: ${symbol}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/dates?symbolToken=${symbolToken}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.dates || data;
  } catch (error) {
    console.warn('API fetch failed, falling back to mock data:', error);
    const historicalData = getCachedMockData(symbol);
    return getAvailableDates(historicalData);
  }
}

export { SYMBOL_TOKENS };