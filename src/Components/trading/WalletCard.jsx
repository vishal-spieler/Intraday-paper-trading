import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, BarChart3, Target, ShieldAlert } from 'lucide-react';
import { formatCurrency } from './mockDataGenerator';

export default function WalletCard({ wallet, todayPnL }) {
  if (!wallet) return null;
  
  const totalPnLPercent = ((wallet.capital - wallet.initial_capital) / wallet.initial_capital * 100).toFixed(2);
  const todayPnLPercent = ((todayPnL || 0) / wallet.initial_capital * 100).toFixed(2);
  const winRate = wallet.total_trades > 0 
    ? ((wallet.winning_trades / wallet.total_trades) * 100).toFixed(1)
    : 0;
  
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-400" />
          Paper Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <div className="text-3xl font-bold text-white">
            {formatCurrency(wallet.capital)}
          </div>
          <div className={`text-sm flex items-center justify-center gap-1 mt-1 ${
            wallet.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {wallet.total_pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {formatCurrency(wallet.total_pnl)} ({totalPnLPercent}%)
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Today's P&L</div>
            <div className={`text-lg font-semibold ${(todayPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(todayPnL || 0)}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Win Rate</div>
            <div className="text-lg font-semibold text-white">{winRate}%</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/30 rounded p-2">
            <div className="text-lg font-bold text-white">{wallet.total_trades}</div>
            <div className="text-xs text-slate-500">Trades</div>
          </div>
          <div className="bg-slate-800/30 rounded p-2">
            <div className="text-lg font-bold text-green-400">{wallet.winning_trades}</div>
            <div className="text-xs text-slate-500">Wins</div>
          </div>
          <div className="bg-slate-800/30 rounded p-2">
            <div className="text-lg font-bold text-red-400">{wallet.losing_trades}</div>
            <div className="text-xs text-slate-500">Losses</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-400">
            <ShieldAlert className="w-3 h-3" />
            Max Drawdown: <span className="text-red-400">{wallet.max_drawdown?.toFixed(2) || 0}%</span>
          </div>
          <Badge variant="outline" className="text-xs text-slate-400">
            {wallet.today_trades || 0}/2 today
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}