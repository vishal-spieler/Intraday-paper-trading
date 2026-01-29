// Mock OHLCV Data Generator for Indian Markets
// Architecture ready for live market data integration

export const generateMockCandles = (symbol, numCandles = 78) => {
  // 78 candles = 6.5 hours of trading (9:15 AM to 3:30 PM) at 5-min intervals
  const candles = [];
  const basePrice = symbol === 'NIFTY' ? 22500 : 48000;
  const volatility = symbol === 'NIFTY' ? 50 : 150;
  
  const startTime = new Date();
  startTime.setHours(9, 15, 0, 0);
  
  let currentPrice = basePrice + (Math.random() - 0.5) * volatility * 2;
  
  for (let i = 0; i < numCandles; i++) {
    const time = new Date(startTime.getTime() + i * 5 * 60 * 1000);
    
    // Generate realistic OHLCV
    const open = currentPrice;
    const change = (Math.random() - 0.5) * volatility * 0.3;
    const high = open + Math.abs(change) + Math.random() * volatility * 0.2;
    const low = open - Math.abs(change) - Math.random() * volatility * 0.2;
    const close = open + change;
    const volume = Math.floor(50000 + Math.random() * 150000);
    
    candles.push({
      time: time.toISOString(),
      timestamp: time.getTime(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    });
    
    currentPrice = close;
  }
  
  return candles;
};

// Generate historical data for multiple days
export const generateHistoricalData = (symbol, numDays = 10) => {
  const historicalData = {};
  const today = new Date();
  
  for (let dayOffset = 0; dayOffset < numDays; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    
    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    const dateStr = date.toISOString().split('T')[0];
    const candles = [];
    const basePrice = symbol === 'NIFTY' ? 22500 : 48000;
    const volatility = symbol === 'NIFTY' ? 50 : 150;
    
    // Add some daily variation
    const dailyTrend = (Math.random() - 0.5) * volatility;
    let currentPrice = basePrice + dailyTrend + (Math.random() - 0.5) * volatility;
    
    // Generate 78 candles for the day (9:15 AM - 3:30 PM)
    for (let i = 0; i < 78; i++) {
      const time = new Date(date);
      time.setHours(9, 15 + i * 5, 0, 0);
      
      const open = currentPrice;
      const change = (Math.random() - 0.5) * volatility * 0.3;
      const high = open + Math.abs(change) + Math.random() * volatility * 0.2;
      const low = open - Math.abs(change) - Math.random() * volatility * 0.2;
      const close = open + change;
      const volume = Math.floor(50000 + Math.random() * 150000);
      
      candles.push({
        time: time.toISOString(),
        timestamp: time.getTime(),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume
      });
      
      currentPrice = close;
    }
    
    historicalData[dateStr] = candles;
  }
  
  return historicalData;
};

// Get available trading dates
export const getAvailableDates = (historicalData) => {
  return Object.keys(historicalData).sort((a, b) => new Date(b) - new Date(a));
};

// Calculate VWAP
export const calculateVWAP = (candles) => {
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  
  return candles.map(candle => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTPV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
    
    return {
      time: candle.time,
      value: parseFloat((cumulativeTPV / cumulativeVolume).toFixed(2))
    };
  });
};

// Calculate EMA
export const calculateEMA = (candles, period) => {
  const multiplier = 2 / (period + 1);
  const ema = [];
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < candles.length; i++) {
    sum += candles[i].close;
  }
  
  if (candles.length >= period) {
    ema.push({
      time: candles[period - 1].time,
      value: parseFloat((sum / period).toFixed(2))
    });
    
    for (let i = period; i < candles.length; i++) {
      const newEma = (candles[i].close - ema[ema.length - 1].value) * multiplier + ema[ema.length - 1].value;
      ema.push({
        time: candles[i].time,
        value: parseFloat(newEma.toFixed(2))
      });
    }
  }
  
  return ema;
};

// Calculate average volume
export const calculateAvgVolume = (candles, period = 20) => {
  if (candles.length < period) return 0;
  const recentCandles = candles.slice(-period);
  const sum = recentCandles.reduce((acc, c) => acc + c.volume, 0);
  return sum / period;
};

// Find recent swing low (for BUY stop loss)
const findRecentSwingLow = (candles, currentIndex, lookback = 10) => {
  const startIndex = Math.max(0, currentIndex - lookback);
  let swingLow = candles[currentIndex].low;
  
  for (let i = startIndex; i < currentIndex; i++) {
    if (candles[i].low < swingLow) {
      swingLow = candles[i].low;
    }
  }
  
  return swingLow;
};

// Find recent swing high (for SELL stop loss)
const findRecentSwingHigh = (candles, currentIndex, lookback = 10) => {
  const startIndex = Math.max(0, currentIndex - lookback);
  let swingHigh = candles[currentIndex].high;
  
  for (let i = startIndex; i < currentIndex; i++) {
    if (candles[i].high > swingHigh) {
      swingHigh = candles[i].high;
    }
  }
  
  return swingHigh;
};

// Detect trading signals based on strategy
export const detectSignals = (candles, vwap, ema9, ema20) => {
  const signals = [];
  const avgVolume = calculateAvgVolume(candles);
  
  for (let i = Math.max(20, ema20.length - candles.length + 20); i < candles.length; i++) {
    const candle = candles[i];
    const prevCandle = candles[i - 1];
    const prevPrevCandle = candles[i - 2];
    const vwapValue = vwap[i]?.value;
    const prevVwapValue = vwap[i - 1]?.value;
    
    // Find corresponding EMA values
    const ema9Index = i - (candles.length - ema9.length);
    const ema20Index = i - (candles.length - ema20.length);
    
    if (ema9Index < 0 || ema20Index < 0 || !prevCandle || !prevPrevCandle) continue;
    
    const ema9Value = ema9[ema9Index]?.value;
    const ema20Value = ema20[ema20Index]?.value;
    
    if (!vwapValue || !ema9Value || !ema20Value || !prevVwapValue) continue;
    
    const isBullishCandle = candle.close > candle.open;
    const isBearishCandle = candle.close < candle.open;
    const isAboveAvgVolume = candle.volume > avgVolume;
    
    // Check if price sustained above/below VWAP for at least 2 candles
    const sustainedAboveVWAP = candle.close > vwapValue && prevCandle.close > prevVwapValue;
    const sustainedBelowVWAP = candle.close < vwapValue && prevCandle.close < prevVwapValue;
    
    // Check for pullback (price touched EMA20 or VWAP)
    const touchedEMA20 = candle.low <= ema20Value && candle.high >= ema20Value;
    const touchedVWAP = candle.low <= vwapValue && candle.high >= vwapValue;
    const pullback = touchedEMA20 || touchedVWAP;
    
    // BUY Signal - with sustained price above VWAP
    if (
      sustainedAboveVWAP &&
      ema9Value > ema20Value &&
      pullback &&
      isBullishCandle &&
      isAboveAvgVolume
    ) {
      const swingLow = findRecentSwingLow(candles, i, 10);
      const entryPrice = candle.high;
      const stopLoss = swingLow - 2; // Small buffer below swing low
      const slDistance = entryPrice - stopLoss;
      const potentialTarget = entryPrice + (slDistance * 1.5);
      
      // Only add signal if risk-reward is valid (at least 1:1.5)
      if (slDistance > 0 && (potentialTarget - entryPrice) / slDistance >= 1.5) {
        signals.push({
          type: 'BUY',
          time: candle.time,
          index: i,
          candle,
          entryTrigger: entryPrice,
          stopLoss: stopLoss,
          reason: `Price sustained above VWAP (2+ candles), EMA9 > EMA20, Pullback to ${touchedVWAP ? 'VWAP' : 'EMA20'}, Bullish candle with high volume, SL at swing low`
        });
      }
    }
    
    // SELL Signal - with sustained price below VWAP
    if (
      sustainedBelowVWAP &&
      ema9Value < ema20Value &&
      pullback &&
      isBearishCandle &&
      isAboveAvgVolume
    ) {
      const swingHigh = findRecentSwingHigh(candles, i, 10);
      const entryPrice = candle.low;
      const stopLoss = swingHigh + 2; // Small buffer above swing high
      const slDistance = stopLoss - entryPrice;
      const potentialTarget = entryPrice - (slDistance * 1.5);
      
      // Only add signal if risk-reward is valid (at least 1:1.5)
      if (slDistance > 0 && (entryPrice - potentialTarget) / slDistance >= 1.5) {
        signals.push({
          type: 'SELL',
          time: candle.time,
          index: i,
          candle,
          entryTrigger: entryPrice,
          stopLoss: stopLoss,
          reason: `Price sustained below VWAP (2+ candles), EMA9 < EMA20, Pullback to ${touchedVWAP ? 'VWAP' : 'EMA20'}, Bearish candle with high volume, SL at swing high`
        });
      }
    }
  }
  
  return signals;
};

// Calculate trade parameters
export const calculateTradeParams = (signal, capital, riskPercent = 1, rrRatio = 1.5) => {
  const maxRisk = capital * (riskPercent / 100);
  const slDistance = Math.abs(signal.entryTrigger - signal.stopLoss);
  
  // Validate minimum risk-reward ratio
  if (slDistance <= 0) return null;
  
  const quantity = Math.floor(maxRisk / slDistance);
  
  let target;
  if (signal.type === 'BUY') {
    target = signal.entryTrigger + (slDistance * rrRatio);
  } else {
    target = signal.entryTrigger - (slDistance * rrRatio);
  }
  
  // Final validation: ensure R:R is at least 1:1.5
  const actualRR = signal.type === 'BUY' 
    ? (target - signal.entryTrigger) / slDistance
    : (signal.entryTrigger - target) / slDistance;
  
  if (actualRR < 1.5) return null;
  
  return {
    entry: parseFloat(signal.entryTrigger.toFixed(2)),
    stopLoss: parseFloat(signal.stopLoss.toFixed(2)),
    target: parseFloat(target.toFixed(2)),
    quantity: Math.max(1, quantity),
    riskAmount: parseFloat((quantity * slDistance).toFixed(2)),
    riskReward: parseFloat(actualRR.toFixed(2))
  };
};

// Check if within trading hours (9:30 AM - 3:00 PM IST)
export const isWithinTradingHours = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;
  
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 15 * 60;      // 3:00 PM
  
  return currentTime >= marketOpen && currentTime <= marketClose;
};

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};