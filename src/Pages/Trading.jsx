import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, Activity, Brain, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';

import CandlestickChart from '@/components/trading/CandlestickChart';
import SignalPanel from '@/components/trading/SignalPanel';
import ActiveTrade from '@/components/trading/ActiveTrade';
import WalletCard from '@/components/trading/WalletCard';
import TradeHistory from '@/components/trading/TradeHistory';
import PerformanceStats from '@/components/trading/PerformanceStats';
import SymbolSelector from '@/components/trading/SymbolSelector';
import ReplayControls from '@/components/trading/ReplayControls';
import StrategyOptimizer from '@/components/trading/StrategyOptimizer';

import {
  calculateVWAP,
  calculateEMA,
  detectSignals,
  calculateTradeParams,
  isWithinTradingHours,
  formatCurrency
} from '@/components/trading/mockDataGenerator';

import { fetchLiveCandles, fetchHistoricalCandles, fetchAvailableDates } from '@/components/trading/marketDataApi';

const INITIAL_CAPITAL = 100000;
const MAX_RISK_PERCENT = 1;
const RR_RATIO = 1.5;
const MAX_TRADES_PER_DAY = 2;
const MAX_SL_HITS_PER_DAY = 2;
const REFRESH_INTERVAL = 30000; // 30 seconds

export default function TradingPage() {
  const queryClient = useQueryClient();
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [candles, setCandles] = useState([]);
  const [indicators, setIndicators] = useState({ vwap: [], ema9: [], ema20: [] });
  const [signals, setSignals] = useState([]);
  const [tradeParams, setTradeParams] = useState({});
  const [symbolData, setSymbolData] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [highlightedSignalTime, setHighlightedSignalTime] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Replay mode state
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [replayDate, setReplayDate] = useState('');
  const [currentCandleIndex, setCurrentCandleIndex] = useState(0);
  const [isReplayPaused, setIsReplayPaused] = useState(true);
  const [playSpeed, setPlaySpeed] = useState(1000);
  const [fullDayCandles, setFullDayCandles] = useState([]);
  const [lastTradeExitIndex, setLastTradeExitIndex] = useState(-1);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [strategyParams, setStrategyParams] = useState({
    ema9Period: 9,
    ema20Period: 20,
    riskPercent: 1,
    rrRatio: 1.5
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch wallet
  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list(),
  });

  // Fetch trades
  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-created_date'),
  });

  const wallet = wallets?.[0];
  const activeTrade = trades.find(t => t.status === 'ACTIVE');
  const todayTrades = trades.filter(t => t.trade_date === today);
  const todaySLHits = todayTrades.filter(t => t.status === 'SL_HIT').length;
  const todayPnL = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Trading rules check
  const tradingHours = isWithinTradingHours();
  const canTrade = tradingHours &&
    todayTrades.length < MAX_TRADES_PER_DAY &&
    todaySLHits < MAX_SL_HITS_PER_DAY &&
    !activeTrade;

  let blockReason = '';
  if (!tradingHours) blockReason = 'Outside trading hours';
  else if (todayTrades.length >= MAX_TRADES_PER_DAY) blockReason = 'Max trades reached';
  else if (todaySLHits >= MAX_SL_HITS_PER_DAY) blockReason = 'Max SL hits reached';
  else if (activeTrade) blockReason = 'Active trade exists';

  // Create wallet mutation
  const createWalletMutation = useMutation({
    mutationFn: (data) => base44.entities.Wallet.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallets'] }),
  });

  // Update wallet mutation
  const updateWalletMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Wallet.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallets'] }),
  });

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: (data) => base44.entities.Trade.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades'] }),
  });

  // Update trade mutation
  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Trade.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades'] }),
  });

  // Initialize wallet if not exists
  useEffect(() => {
    if (!walletsLoading && !wallet) {
      createWalletMutation.mutate({
        capital: INITIAL_CAPITAL,
        initial_capital: INITIAL_CAPITAL,
        total_pnl: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        max_drawdown: 0,
        today_trades: 0,
        today_sl_hits: 0,
        today_pnl: 0,
        last_reset_date: today
      });
    }
  }, [walletsLoading, wallet]);

  // Daily reset check
  useEffect(() => {
    if (wallet && wallet.last_reset_date !== today) {
      updateWalletMutation.mutate({
        id: wallet.id,
        data: {
          today_trades: 0,
          today_sl_hits: 0,
          today_pnl: 0,
          last_reset_date: today
        }
      });
    }
  }, [wallet, today]);

  // Fetch available dates for replay mode
  useEffect(() => {
    const loadAvailableDates = async () => {
      try {
        const dates = await fetchAvailableDates(selectedSymbol);
        setAvailableDates(dates);
        if (dates.length > 0) {
          setReplayDate(dates[0]);
        }
      } catch (error) {
        console.error('Error fetching available dates:', error);
        toast.error('Failed to load historical dates');
      }
    };

    loadAvailableDates();
  }, [selectedSymbol]);

  // Fetch and process live market data
  const refreshData = useCallback(async () => {
    if (isReplayMode) return; // Don't refresh in replay mode

    setIsRefreshing(true);
    setApiError(null);

    try {
      // Fetch live candles from API
      const newCandles = await fetchLiveCandles(selectedSymbol);

      if (!newCandles || newCandles.length === 0) {
        throw new Error('No data received from API');
      }

      // Calculate indicators
      const vwap = calculateVWAP(newCandles);
      const ema9 = calculateEMA(newCandles, 9);
      const ema20 = calculateEMA(newCandles, 20);
      const detectedSignals = detectSignals(newCandles, vwap, ema9, ema20, lastTradeExitIndex);

      // Calculate trade params for each signal
      const params = {};
      detectedSignals.forEach(signal => {
        const tradeParam = calculateTradeParams(signal, wallet?.capital || INITIAL_CAPITAL, MAX_RISK_PERCENT, RR_RATIO);
        if (tradeParam) {
          params[signal.time] = tradeParam;
        }
      });

      setCandles(newCandles);
      setIndicators({ vwap, ema9, ema20 });
      setSignals(detectedSignals);
      setTradeParams(params);
      setIsLiveConnected(true);

      console.log('Debug: VWAP length:', vwap.length, 'First val:', vwap[0]);


      // Update symbol data
      const lastCandle = newCandles[newCandles.length - 1];
      const prevCandle = newCandles[newCandles.length - 2];
      setSymbolData(prev => ({
        ...prev,
        [selectedSymbol]: {
          lastPrice: lastCandle?.close,
          priceChange: prevCandle ? ((lastCandle.close - prevCandle.close) / prevCandle.close * 100) : 0
        }
      }));

    } catch (error) {
      console.error('Error fetching live data:', error);
      setApiError(error.message);
      setIsLiveConnected(false);
      toast.error(`Failed to fetch live data: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedSymbol, wallet, isReplayMode, lastTradeExitIndex]);

  // Initial data load and auto-refresh
  useEffect(() => {
    if (!isReplayMode) {
      refreshData();
      const interval = setInterval(refreshData, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [selectedSymbol, refreshData, isReplayMode]);

  // Replay mode: Toggle replay
  const handleToggleReplay = async () => {
    if (!isReplayMode) {
      // Check if we have a valid date to replay
      if (!replayDate) {
        toast.error('No historical dates available');
        return;
      }

      // Enter replay mode
      setIsReplayMode(true);
      setCurrentCandleIndex(0);
      setIsReplayPaused(true);

      // Load historical data from API
      try {
        const historicalCandles = await fetchHistoricalCandles(selectedSymbol, replayDate);
        setFullDayCandles(historicalCandles);
      } catch (error) {
        console.error('Error loading historical data:', error);
        toast.error('Failed to load historical data');
        setIsReplayMode(false);
      }
    } else {
      // Exit replay mode
      setIsReplayMode(false);
      setCurrentCandleIndex(0);
      setFullDayCandles([]);
      refreshData(); // Go back to live data
    }
  };

  // Replay mode: Change date
  const handleReplayDateChange = async (newDate) => {
    setReplayDate(newDate);
    setCurrentCandleIndex(0);
    setIsReplayPaused(true);
    setLastTradeExitIndex(-1);
    setSelectedSignal(null);
    setHighlightedSignalTime(null);

    // Fetch historical data for new date
    try {
      const historicalCandles = await fetchHistoricalCandles(selectedSymbol, newDate);
      setFullDayCandles(historicalCandles);
    } catch (error) {
      console.error('Error loading historical data:', error);
      toast.error('Failed to load historical data for selected date');
    }
  };

  // Replay mode: Process candles up to current index
  useEffect(() => {
    if (isReplayMode && fullDayCandles.length > 0) {
      const visibleCandles = fullDayCandles.slice(0, currentCandleIndex + 1);

      if (visibleCandles.length > 0) {
        const vwap = calculateVWAP(visibleCandles);
        const ema9 = calculateEMA(visibleCandles, 9);
        const ema20 = calculateEMA(visibleCandles, 20);
        const detectedSignals = detectSignals(visibleCandles, vwap, ema9, ema20, lastTradeExitIndex);

        // Calculate trade params
        const params = {};
        detectedSignals.forEach(signal => {
          const tradeParam = calculateTradeParams(signal, wallet?.capital || INITIAL_CAPITAL, MAX_RISK_PERCENT, RR_RATIO);
          if (tradeParam) {
            params[signal.time] = tradeParam;
          }
        });

        setCandles(visibleCandles);
        setIndicators({ vwap, ema9, ema20 });
        setSignals(detectedSignals);
        setTradeParams(params);
        setSelectedSignal(null);
        setHighlightedSignalTime(null);

        // Update symbol data
        const lastCandle = visibleCandles[visibleCandles.length - 1];
        const prevCandle = visibleCandles[visibleCandles.length - 2];
        setSymbolData(prev => ({
          ...prev,
          [selectedSymbol]: {
            lastPrice: lastCandle?.close,
            priceChange: prevCandle ? ((lastCandle.close - prevCandle.close) / prevCandle.close * 100) : 0
          }
        }));
      }
    }
  }, [isReplayMode, currentCandleIndex, fullDayCandles, selectedSymbol, wallet, lastTradeExitIndex]);

  // Replay mode: Auto-play
  useEffect(() => {
    if (isReplayMode && !isReplayPaused && currentCandleIndex < fullDayCandles.length - 1) {
      const timer = setTimeout(() => {
        setCurrentCandleIndex(prev => Math.min(prev + 1, fullDayCandles.length - 1));
      }, playSpeed);
      return () => clearTimeout(timer);
    }
  }, [isReplayMode, isReplayPaused, currentCandleIndex, fullDayCandles, playSpeed]);

  // Replay controls
  const handleTogglePause = () => setIsReplayPaused(!isReplayPaused);
  const handleStepForward = () => {
    if (currentCandleIndex < fullDayCandles.length - 1) {
      setCurrentCandleIndex(prev => prev + 1);
    }
  };
  const handleStepBack = () => {
    if (currentCandleIndex > 0) {
      setCurrentCandleIndex(prev => prev - 1);
    }
  };
  const handleReset = () => {
    setCurrentCandleIndex(0);
    setIsReplayPaused(true);
    setLastTradeExitIndex(-1);
    setSelectedSignal(null);
    setHighlightedSignalTime(null);
  };
  const handleSpeedChange = (speed) => setPlaySpeed(speed);

  // Check active trade for target/SL hit
  useEffect(() => {
    if (activeTrade && candles.length > 0) {
      const currentPrice = candles[candles.length - 1].close;
      const isBuy = activeTrade.type === 'BUY';

      let status = null;
      let exitPrice = null;

      if (isBuy) {
        if (currentPrice >= activeTrade.target) {
          status = 'TARGET_HIT';
          exitPrice = activeTrade.target;
        } else if (currentPrice <= activeTrade.stop_loss) {
          status = 'SL_HIT';
          exitPrice = activeTrade.stop_loss;
        }
      } else {
        if (currentPrice <= activeTrade.target) {
          status = 'TARGET_HIT';
          exitPrice = activeTrade.target;
        } else if (currentPrice >= activeTrade.stop_loss) {
          status = 'SL_HIT';
          exitPrice = activeTrade.stop_loss;
        }
      }

      if (status) {
        const pnl = isBuy
          ? (exitPrice - activeTrade.entry_price) * activeTrade.quantity
          : (activeTrade.entry_price - exitPrice) * activeTrade.quantity;

        const pnlPercent = (pnl / (activeTrade.entry_price * activeTrade.quantity)) * 100;

        // Track exit candle index for cooldown
        setLastTradeExitIndex(candles.length - 1);

        updateTradeMutation.mutate({
          id: activeTrade.id,
          data: {
            status,
            exit_price: exitPrice,
            exit_time: new Date().toISOString(),
            pnl,
            pnl_percent: pnlPercent
          }
        });

        // Update wallet
        if (wallet) {
          const newCapital = wallet.capital + pnl;
          const newDrawdown = Math.max(
            wallet.max_drawdown || 0,
            ((wallet.initial_capital - newCapital) / wallet.initial_capital) * 100
          );

          updateWalletMutation.mutate({
            id: wallet.id,
            data: {
              capital: newCapital,
              total_pnl: (wallet.total_pnl || 0) + pnl,
              total_trades: (wallet.total_trades || 0) + 1,
              winning_trades: (wallet.winning_trades || 0) + (pnl > 0 ? 1 : 0),
              losing_trades: (wallet.losing_trades || 0) + (pnl <= 0 ? 1 : 0),
              max_drawdown: newDrawdown,
              today_sl_hits: (wallet.today_sl_hits || 0) + (status === 'SL_HIT' ? 1 : 0),
              today_pnl: (wallet.today_pnl || 0) + pnl
            }
          });
        }

        toast[status === 'TARGET_HIT' ? 'success' : 'error'](
          `${status === 'TARGET_HIT' ? '🎯 Target Hit!' : '🛑 Stop Loss Hit!'} P&L: ${formatCurrency(pnl)}`
        );
      }
    }
  }, [candles, activeTrade]);

  // Execute trade
  const handleExecuteTrade = async (signal, params) => {
    if (!canTrade || !wallet || !params) return;

    // Validate risk-reward ratio
    if (params.riskReward < 1.5) {
      toast.error('Risk-Reward ratio must be at least 1:1.5');
      return;
    }

    const tradeData = {
      symbol: selectedSymbol,
      type: signal.type,
      entry_price: params.entry,
      stop_loss: params.stopLoss,
      target: params.target,
      quantity: params.quantity,
      status: 'ACTIVE',
      entry_time: new Date().toISOString(),
      signal_reason: signal.reason,
      trade_date: today
    };

    await createTradeMutation.mutateAsync(tradeData);

    // Update wallet today_trades
    updateWalletMutation.mutate({
      id: wallet.id,
      data: {
        today_trades: (wallet.today_trades || 0) + 1
      }
    });

    toast.success(`${signal.type} order executed at ${params.entry}`);
  };

  // Manual exit
  const handleManualExit = async () => {
    if (!activeTrade || !candles.length) return;

    const exitPrice = candles[candles.length - 1].close;
    const isBuy = activeTrade.type === 'BUY';
    const pnl = isBuy
      ? (exitPrice - activeTrade.entry_price) * activeTrade.quantity
      : (activeTrade.entry_price - exitPrice) * activeTrade.quantity;
    const pnlPercent = (pnl / (activeTrade.entry_price * activeTrade.quantity)) * 100;

    // Track exit candle index for cooldown
    setLastTradeExitIndex(candles.length - 1);

    await updateTradeMutation.mutateAsync({
      id: activeTrade.id,
      data: {
        status: 'MANUAL_EXIT',
        exit_price: exitPrice,
        exit_time: new Date().toISOString(),
        pnl,
        pnl_percent: pnlPercent
      }
    });

    // Update wallet
    if (wallet) {
      const newCapital = wallet.capital + pnl;
      const newDrawdown = Math.max(
        wallet.max_drawdown || 0,
        ((wallet.initial_capital - newCapital) / wallet.initial_capital) * 100
      );

      updateWalletMutation.mutate({
        id: wallet.id,
        data: {
          capital: newCapital,
          total_pnl: (wallet.total_pnl || 0) + pnl,
          total_trades: (wallet.total_trades || 0) + 1,
          winning_trades: (wallet.winning_trades || 0) + (pnl > 0 ? 1 : 0),
          losing_trades: (wallet.losing_trades || 0) + (pnl <= 0 ? 1 : 0),
          max_drawdown: newDrawdown,
          today_pnl: (wallet.today_pnl || 0) + pnl
        }
      });
    }

    toast.info(`Manual exit at ${exitPrice.toFixed(2)}. P&L: ${formatCurrency(pnl)}`);
  };

  const handleApplyOptimizedParams = (params) => {
    setStrategyParams(params);
    toast.success('Strategy parameters updated! Refreshing data...');
    setTimeout(() => refreshData(), 500);
  };

  const handleSignalClick = (signal, params) => {
    if (params) {
      setSelectedSignal({ ...signal, ...params });
      setHighlightedSignalTime(signal.time);
    }
  };

  const currentPrice = candles[candles.length - 1]?.close || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Intraday Paper Trader</h1>
            <div className="flex items-center gap-2">
              <p className="text-slate-400 text-sm">Indian Markets • 5-Minute Charts</p>
              {!isReplayMode && (
                <Badge variant="outline" className={`text-xs ${isLiveConnected ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}`}>
                  {isLiveConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                  {isLiveConnected ? 'Live' : 'Disconnected'}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SymbolSelector
              selectedSymbol={selectedSymbol}
              onSelectSymbol={setSelectedSymbol}
              symbolData={symbolData}
              isWithinTradingHours={tradingHours}
            />
            <Button
              variant="outline"
              onClick={() => setShowOptimizer(!showOptimizer)}
              className="bg-slate-800 border-slate-700"
            >
              <Brain className="w-4 h-4 mr-2" />
              {showOptimizer ? 'Hide' : 'Optimize'}
            </Button>
            {!isReplayMode && (
              <Button
                variant="outline"
                size="icon"
                onClick={refreshData}
                disabled={isRefreshing}
                className="bg-slate-800 border-slate-700"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* API Error banner */}
        {apiError && !isReplayMode && (
          <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-800 rounded-lg">
            <WifiOff className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">API Error: {apiError}</span>
          </div>
        )}

        {/* Replay mode banner */}
        {isReplayMode && (
          <div className="flex items-center gap-2 p-3 bg-purple-950/30 border border-purple-800 rounded-lg">
            <Activity className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="text-purple-400 text-sm">
              Replay Mode: {format(new Date(replayDate), 'dd MMM yyyy')} -
              Candle {currentCandleIndex + 1} of {fullDayCandles.length}
            </span>
          </div>
        )}

        {/* Warning banner */}
        {blockReason && !activeTrade && !isReplayMode && (
          <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 text-sm">{blockReason} - New trades blocked</span>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Chart - spans 3 columns */}
          <div className="lg:col-span-3 space-y-4">
            <CandlestickChart
              candles={candles}
              vwap={indicators.vwap}
              ema9={indicators.ema9}
              ema20={indicators.ema20}
              signals={signals}
              symbol={selectedSymbol}
              activeTrade={activeTrade}
              trades={trades.filter(t => t.status !== 'ACTIVE')}
              highlightedSignalTime={highlightedSignalTime}
            />

            {/* Selected Signal Details */}
            {selectedSignal && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Badge className={`px-2 py-1 ${selectedSignal.type === 'BUY' ? 'bg-green-600' : 'bg-red-600'}`}>
                      {selectedSignal.type}
                    </Badge>
                    Signal Details
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedSignal(null);
                      setHighlightedSignalTime(null);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-slate-400 text-xs mb-1">Time</div>
                    <div className="text-white font-mono">{format(new Date(selectedSignal.time), 'dd MMM, HH:mm')}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-slate-400 text-xs mb-1">Entry Price</div>
                    <div className="text-white font-mono">{selectedSignal.entry}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-slate-400 text-xs mb-1">Confidence</div>
                    <div className="text-white font-semibold">{selectedSignal.confidence}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-slate-400 text-xs mb-1">Stop Loss</div>
                    <div className="text-red-400 font-mono">{selectedSignal.stopLoss}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-slate-400 text-xs mb-1">Target</div>
                    <div className="text-green-400 font-mono">{selectedSignal.target}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-slate-400 text-xs mb-1">Risk:Reward</div>
                    <div className="text-green-400 font-mono">1:{selectedSignal.riskReward}</div>
                  </div>
                </div>
                <div className="mt-3 bg-slate-800/30 rounded p-3">
                  <div className="text-slate-400 text-xs mb-1">Reason</div>
                  <p className="text-slate-300 text-sm">{selectedSignal.reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <WalletCard wallet={wallet} todayPnL={todayPnL} />

            {/* Replay Controls */}
            <ReplayControls
              isReplayMode={isReplayMode}
              onToggleReplay={handleToggleReplay}
              isPaused={isReplayPaused}
              onTogglePause={handleTogglePause}
              onStepForward={handleStepForward}
              onStepBack={handleStepBack}
              onReset={handleReset}
              playSpeed={playSpeed}
              onSpeedChange={handleSpeedChange}
              currentCandle={currentCandleIndex}
              totalCandles={fullDayCandles.length}
              replayDate={replayDate}
              availableDates={availableDates}
              onDateChange={handleReplayDateChange}
            />

            <SignalPanel
              signals={signals}
              onExecuteTrade={handleExecuteTrade}
              tradeParams={tradeParams}
              canTrade={canTrade}
              tradingBlocked={!!blockReason}
              blockReason={blockReason}
              activeTrade={activeTrade}
              onSignalClick={handleSignalClick}
            />
          </div>
        </div>

        {/* Active trade */}
        {activeTrade && (
          <ActiveTrade
            trade={activeTrade}
            currentPrice={currentPrice}
            onManualExit={handleManualExit}
          />
        )}

        {/* Strategy Optimizer */}
        {showOptimizer && (
          <StrategyOptimizer
            symbol={selectedSymbol}
            currentParams={strategyParams}
            onApplyParams={handleApplyOptimizedParams}
          />
        )}

        {/* Performance stats */}
        <PerformanceStats
          wallet={wallet}
          trades={trades}
          todayTrades={todayTrades}
        />

        {/* Trade history */}
        <TradeHistory trades={trades} />
      </div>
    </div>
  );
}