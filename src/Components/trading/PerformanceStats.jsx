import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldAlert,
  BarChart3,
  Percent,
  Wallet,
  Calendar
} from 'lucide-react';
import { formatCurrency } from './mockDataGenerator';

export default function PerformanceStats({ wallet, trades, todayTrades }) {
  if (!wallet) return null;
  
  const totalTrades = trades.length;
  const completedTrades = trades.filter(t => t.status !== 'ACTIVE');
  const winningTrades = completedTrades.filter(t => t.pnl > 0);
  const losingTrades = completedTrades.filter(t => t.pnl <= 0);
  
  const winRate = completedTrades.length > 0 
    ? (winningTrades.length / completedTrades.length * 100).toFixed(1)
    : 0;
  
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
    : 0;
    
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
    : 0;
  
  const profitFactor = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A';
  
  const todayPnL = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const todayWins = todayTrades.filter(t => t.pnl > 0).length;
  const todayLosses = todayTrades.filter(t => t.pnl <= 0 && t.status !== 'ACTIVE').length;
  
  const stats = [
    {
      label: 'Total Capital',
      value: formatCurrency(wallet.capital),
      icon: Wallet,
      color: 'text-white',
      bgColor: 'bg-slate-800'
    },
    {
      label: 'Total P&L',
      value: formatCurrency(wallet.total_pnl),
      icon: wallet.total_pnl >= 0 ? TrendingUp : TrendingDown,
      color: wallet.total_pnl >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: wallet.total_pnl >= 0 ? 'bg-green-950/30' : 'bg-red-950/30'
    },
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      icon: Percent,
      color: parseFloat(winRate) >= 50 ? 'text-green-400' : 'text-amber-400',
      bgColor: 'bg-slate-800'
    },
    {
      label: 'Profit Factor',
      value: profitFactor,
      icon: BarChart3,
      color: parseFloat(profitFactor) >= 1.5 ? 'text-green-400' : 'text-amber-400',
      bgColor: 'bg-slate-800'
    },
    {
      label: 'Max Drawdown',
      value: `${wallet.max_drawdown?.toFixed(2) || 0}%`,
      icon: ShieldAlert,
      color: 'text-red-400',
      bgColor: 'bg-red-950/30'
    },
    {
      label: 'Today\'s P&L',
      value: formatCurrency(todayPnL),
      icon: Calendar,
      color: todayPnL >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: 'bg-slate-800'
    },
  ];
  
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          Performance Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div 
                key={idx}
                className={`${stat.bgColor} rounded-lg p-3 border border-slate-700/50`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-slate-400">{stat.label}</span>
                </div>
                <div className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{totalTrades}</div>
            <div className="text-xs text-slate-400">Total Trades</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{winningTrades.length}</div>
            <div className="text-xs text-slate-400">Winning</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{losingTrades.length}</div>
            <div className="text-xs text-slate-400">Losing</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{todayTrades.length}/2</div>
            <div className="text-xs text-slate-400">Today's Trades</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-slate-800/30 rounded-lg">
          <div className="text-xs text-slate-400 mb-2">Today's Summary</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-semibold">{todayWins} Wins</span>
              </div>
              <div className="flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-semibold">{todayLosses} Losses</span>
              </div>
            </div>
            <div className={`text-lg font-bold ${todayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {todayPnL >= 0 ? '+' : ''}{formatCurrency(todayPnL)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}