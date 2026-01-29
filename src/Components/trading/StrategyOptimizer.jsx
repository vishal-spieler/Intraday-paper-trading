import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { Brain, TrendingUp, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { 
  generateHistoricalData, 
  calculateVWAP, 
  calculateEMA, 
  detectSignals,
  calculateTradeParams 
} from './mockDataGenerator';

export default function StrategyOptimizer({ symbol, currentParams, onApplyParams }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

  const runBacktest = (historicalData, params) => {
    const results = [];
    
    Object.keys(historicalData).forEach(date => {
      const candles = historicalData[date];
      const vwap = calculateVWAP(candles);
      const ema9 = calculateEMA(candles, params.ema9Period || 9);
      const ema20 = calculateEMA(candles, params.ema20Period || 20);
      const signals = detectSignals(candles, vwap, ema9, ema20, -1);
      
      signals.forEach(signal => {
        const tradeParam = calculateTradeParams(signal, 100000, params.riskPercent || 1, params.rrRatio || 1.5);
        if (tradeParam) {
          // Simulate trade execution
          const entry = tradeParam.entry;
          const sl = tradeParam.stopLoss;
          const target = tradeParam.target;
          
          // Check if target or SL hit in subsequent candles
          const entryIndex = candles.findIndex(c => c.time === signal.time);
          let outcome = 'NO_EXIT';
          let pnl = 0;
          
          for (let i = entryIndex + 1; i < candles.length; i++) {
            const c = candles[i];
            if (signal.type === 'BUY') {
              if (c.high >= target) {
                outcome = 'TARGET_HIT';
                pnl = (target - entry) * tradeParam.quantity;
                break;
              } else if (c.low <= sl) {
                outcome = 'SL_HIT';
                pnl = (sl - entry) * tradeParam.quantity;
                break;
              }
            } else {
              if (c.low <= target) {
                outcome = 'TARGET_HIT';
                pnl = (entry - target) * tradeParam.quantity;
                break;
              } else if (c.high >= sl) {
                outcome = 'SL_HIT';
                pnl = (entry - sl) * tradeParam.quantity;
                break;
              }
            }
          }
          
          results.push({
            date,
            type: signal.type,
            entry,
            sl,
            target,
            outcome,
            pnl,
            riskReward: tradeParam.riskReward
          });
        }
      });
    });
    
    return results;
  };

  const analyzeStrategy = async () => {
    setIsAnalyzing(true);
    setError(null);
    setRecommendations(null);

    try {
      // Generate historical data for backtesting
      const historicalData = generateHistoricalData(symbol, 30);
      
      // Run backtest with current parameters
      const baseParams = {
        ema9Period: 9,
        ema20Period: 20,
        riskPercent: 1,
        rrRatio: 1.5
      };
      
      const backtestResults = runBacktest(historicalData, baseParams);
      
      // Calculate performance metrics
      const totalTrades = backtestResults.length;
      const winningTrades = backtestResults.filter(t => t.pnl > 0).length;
      const losingTrades = backtestResults.filter(t => t.pnl < 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
      const totalPnL = backtestResults.reduce((sum, t) => sum + t.pnl, 0);
      const avgWin = winningTrades > 0 
        ? backtestResults.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades 
        : 0;
      const avgLoss = losingTrades > 0
        ? Math.abs(backtestResults.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / losingTrades)
        : 0;
      const profitFactor = avgLoss > 0 ? (avgWin * winningTrades) / (avgLoss * losingTrades) : 0;

      // Prepare data for AI analysis
      const analysisData = {
        symbol,
        currentParams: baseParams,
        backtestPeriod: '30 days',
        totalTrades,
        winRate: parseFloat(winRate),
        totalPnL,
        avgWin,
        avgLoss,
        profitFactor: profitFactor.toFixed(2),
        winningTrades,
        losingTrades,
        sampleTrades: backtestResults.slice(-10).map(t => ({
          date: t.date,
          type: t.type,
          outcome: t.outcome,
          pnl: t.pnl.toFixed(2),
          riskReward: t.riskReward
        }))
      };

      // Call AI for strategy optimization
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a trading strategy optimization expert. Analyze this backtest data and suggest specific parameter improvements.

Current Strategy Parameters:
- EMA 9 Period: ${baseParams.ema9Period}
- EMA 20 Period: ${baseParams.ema20Period}
- Risk Per Trade: ${baseParams.riskPercent}%
- Risk-Reward Ratio: ${baseParams.rrRatio}

Backtest Results (${analysisData.backtestPeriod}):
- Total Trades: ${totalTrades}
- Win Rate: ${winRate}%
- Total P&L: ₹${totalPnL.toFixed(2)}
- Profit Factor: ${profitFactor.toFixed(2)}
- Avg Win: ₹${avgWin.toFixed(2)}
- Avg Loss: ₹${avgLoss.toFixed(2)}
- Winning Trades: ${winningTrades}
- Losing Trades: ${losingTrades}

Recent Trade Sample:
${JSON.stringify(analysisData.sampleTrades, null, 2)}

Based on this data, provide specific, actionable recommendations to improve profitability and risk management. Focus on:
1. EMA period adjustments (if needed)
2. Risk-reward ratio optimization
3. Risk percentage per trade adjustments
4. Entry/exit condition improvements
5. Market condition considerations for ${symbol}

Provide concrete numbers and explain your reasoning briefly.`,
        response_json_schema: {
          type: "object",
          properties: {
            overallAssessment: { type: "string" },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  parameter: { type: "string" },
                  currentValue: { type: "string" },
                  suggestedValue: { type: "string" },
                  reasoning: { type: "string" },
                  expectedImpact: { type: "string" }
                }
              }
            },
            suggestedParameters: {
              type: "object",
              properties: {
                ema9Period: { type: "number" },
                ema20Period: { type: "number" },
                riskPercent: { type: "number" },
                rrRatio: { type: "number" }
              }
            },
            additionalTips: { type: "array", items: { type: "string" } }
          }
        }
      });

      setRecommendations({
        ...aiResponse,
        backtestMetrics: analysisData
      });

    } catch (err) {
      setError(err.message || 'Failed to analyze strategy');
      console.error('Strategy analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyRecommendations = () => {
    if (recommendations?.suggestedParameters) {
      onApplyParams(recommendations.suggestedParameters);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="w-5 h-5 text-purple-400" />
          AI Strategy Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!recommendations && !isAnalyzing && (
          <div className="text-center py-6">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-400 opacity-50" />
            <p className="text-slate-400 text-sm mb-4">
              Let AI analyze 30 days of historical data to optimize your trading strategy parameters
            </p>
            <Button 
              onClick={analyzeStrategy}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Brain className="w-4 h-4 mr-2" />
              Analyze & Optimize Strategy
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto mb-3 text-purple-400 animate-spin" />
            <p className="text-slate-400 text-sm">Running backtest and analyzing patterns...</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm font-medium">Analysis Failed</p>
              <p className="text-red-300 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        {recommendations && (
          <div className="space-y-4">
            {/* Backtest Metrics */}
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
              <h3 className="text-white text-sm font-semibold mb-2">Backtest Results (30 days)</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Total Trades:</span>
                  <span className="text-white ml-2">{recommendations.backtestMetrics.totalTrades}</span>
                </div>
                <div>
                  <span className="text-slate-400">Win Rate:</span>
                  <span className={`ml-2 ${recommendations.backtestMetrics.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {recommendations.backtestMetrics.winRate}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Total P&L:</span>
                  <span className={`ml-2 ${recommendations.backtestMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{recommendations.backtestMetrics.totalPnL.toFixed(0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Profit Factor:</span>
                  <span className="text-white ml-2">{recommendations.backtestMetrics.profitFactor}</span>
                </div>
              </div>
            </div>

            {/* Overall Assessment */}
            <div className="bg-purple-950/30 border border-purple-800 rounded-lg p-3">
              <h3 className="text-purple-400 text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Assessment
              </h3>
              <p className="text-slate-300 text-sm">{recommendations.overallAssessment}</p>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h3 className="text-white text-sm font-semibold">Parameter Recommendations</h3>
              {recommendations.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{rec.parameter}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-slate-400 border-slate-600">
                        {rec.currentValue}
                      </Badge>
                      <span className="text-slate-500">→</span>
                      <Badge className="bg-green-600 text-white">
                        {rec.suggestedValue}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs">{rec.reasoning}</p>
                  <p className="text-green-400 text-xs italic">{rec.expectedImpact}</p>
                </div>
              ))}
            </div>

            {/* Additional Tips */}
            {recommendations.additionalTips && recommendations.additionalTips.length > 0 && (
              <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-3">
                <h3 className="text-blue-400 text-sm font-semibold mb-2">Additional Tips</h3>
                <ul className="space-y-1">
                  {recommendations.additionalTips.map((tip, idx) => (
                    <li key={idx} className="text-slate-300 text-xs flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleApplyRecommendations}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!recommendations.suggestedParameters}
              >
                Apply Recommendations
              </Button>
              <Button 
                onClick={analyzeStrategy}
                variant="outline"
                className="border-slate-700"
              >
                Re-analyze
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}