import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Target, 
  ShieldAlert, 
  X,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { formatCurrency } from './mockDataGenerator';

export default function ActiveTrade({ trade, currentPrice, onManualExit }) {
  if (!trade) return null;
  
  const isBuy = trade.type === 'BUY';
  const unrealizedPnL = isBuy 
    ? (currentPrice - trade.entry_price) * trade.quantity
    : (trade.entry_price - currentPrice) * trade.quantity;
  
  const unrealizedPnLPercent = (unrealizedPnL / (trade.entry_price * trade.quantity)) * 100;
  
  // Calculate progress to target/SL
  const totalRange = Math.abs(trade.target - trade.stop_loss);
  const currentProgress = isBuy
    ? ((currentPrice - trade.stop_loss) / totalRange) * 100
    : ((trade.stop_loss - currentPrice) / totalRange) * 100;
  
  const slDistance = isBuy 
    ? currentPrice - trade.stop_loss 
    : trade.stop_loss - currentPrice;
  
  const targetDistance = isBuy
    ? trade.target - currentPrice
    : currentPrice - trade.target;
  
  return (
    <Card className={`border-2 ${isBuy ? 'bg-green-950/20 border-green-700' : 'bg-red-950/20 border-red-700'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            {isBuy ? (
              <ArrowUpCircle className="w-5 h-5 text-green-400" />
            ) : (
              <ArrowDownCircle className="w-5 h-5 text-red-400" />
            )}
            Active {trade.type} Position
          </CardTitle>
          <Badge variant="outline" className="text-amber-400 border-amber-400">
            {trade.symbol}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Entry</div>
            <div className="text-lg font-mono text-white">{formatCurrency(trade.entry_price)}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Current</div>
            <div className={`text-lg font-mono ${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(currentPrice)}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Stop Loss
            </div>
            <div className="text-lg font-mono text-red-400">{formatCurrency(trade.stop_loss)}</div>
            <div className="text-xs text-slate-500">{slDistance.toFixed(2)} pts away</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Target
            </div>
            <div className="text-lg font-mono text-green-400">{formatCurrency(trade.target)}</div>
            <div className="text-xs text-slate-500">{targetDistance.toFixed(2)} pts away</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>SL</span>
            <span>Target</span>
          </div>
          <div className="relative">
            <Progress 
              value={Math.min(100, Math.max(0, currentProgress))} 
              className="h-2 bg-red-900"
            />
            <div 
              className="absolute top-0 left-0 h-2 bg-green-500 rounded-r"
              style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
          <div>
            <div className="text-xs text-slate-400 mb-1">Unrealized P&L</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {unrealizedPnL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {formatCurrency(unrealizedPnL)}
              <span className="text-sm">({unrealizedPnLPercent.toFixed(2)}%)</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">Qty</div>
            <div className="text-xl font-mono text-white">{trade.quantity}</div>
          </div>
        </div>
        
        <Button 
          onClick={onManualExit}
          variant="destructive"
          className="w-full"
        >
          <X className="w-4 h-4 mr-2" />
          Manual Exit @ {formatCurrency(currentPrice)}
        </Button>
      </CardContent>
    </Card>
  );
}