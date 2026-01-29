import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Target, 
  ShieldAlert, 
  LogOut,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from './mockDataGenerator';

const statusConfig = {
  'TARGET_HIT': { label: 'Target Hit', icon: Target, color: 'text-green-400 bg-green-950/50 border-green-800' },
  'SL_HIT': { label: 'SL Hit', icon: ShieldAlert, color: 'text-red-400 bg-red-950/50 border-red-800' },
  'MANUAL_EXIT': { label: 'Manual Exit', icon: LogOut, color: 'text-amber-400 bg-amber-950/50 border-amber-800' },
};

export default function TradeHistory({ trades }) {
  const completedTrades = trades.filter(t => t.status !== 'ACTIVE');
  
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          Trade Journal
          <Badge variant="outline" className="ml-auto text-slate-400">
            {completedTrades.length} trades
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {completedTrades.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No completed trades yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedTrades.map((trade) => {
                const status = statusConfig[trade.status];
                const StatusIcon = status?.icon || Target;
                
                return (
                  <div 
                    key={trade.id}
                    className={`p-3 rounded-lg border ${status?.color || 'border-slate-700'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {trade.type === 'BUY' ? (
                          <ArrowUpCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="font-medium text-white">{trade.symbol}</span>
                        <Badge variant="outline" className="text-xs">
                          {trade.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <StatusIcon className="w-3 h-3" />
                        <span>{status?.label}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                      <div>
                        <div className="text-slate-500">Entry</div>
                        <div className="text-white font-mono">{formatCurrency(trade.entry_price)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Exit</div>
                        <div className="text-white font-mono">{formatCurrency(trade.exit_price)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Qty</div>
                        <div className="text-white font-mono">{trade.quantity}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">P&L</div>
                        <div className={`font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(trade.pnl)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{format(new Date(trade.entry_time), 'dd MMM, HH:mm')}</span>
                      <span className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {trade.pnl_percent?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}