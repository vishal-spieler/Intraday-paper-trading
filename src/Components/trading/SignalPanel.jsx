import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, Clock, Target, ShieldAlert, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from './mockDataGenerator';

export default function SignalPanel({ 
  signals, 
  onExecuteTrade, 
  tradeParams,
  canTrade,
  tradingBlocked,
  blockReason,
  activeTrade,
  onSignalClick
}) {
  const latestSignals = signals.slice(-3).reverse();
  
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Live Signals
          </CardTitle>
          {tradingBlocked && (
            <Badge variant="destructive" className="text-xs">
              {blockReason}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {latestSignals.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Waiting for signals...</p>
            <p className="text-xs mt-1">Monitoring price action</p>
          </div>
        ) : (
          latestSignals.map((signal, idx) => {
            const params = tradeParams?.[signal.time];
            const isLatest = idx === 0;
            
            return (
              <button 
                key={signal.time}
                onClick={() => onSignalClick && onSignalClick(signal, params)}
                className={`block w-full text-left p-3 rounded-lg border transition-all hover:ring-2 hover:ring-purple-500/50 ${
                  signal.type === 'BUY' 
                    ? 'bg-green-950/30 border-green-800' 
                    : 'bg-red-950/30 border-red-800'
                } ${isLatest ? 'ring-1 ring-offset-1 ring-offset-slate-900' : 'opacity-60'} ${
                  isLatest && signal.type === 'BUY' ? 'ring-green-500' : isLatest ? 'ring-red-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {signal.type === 'BUY' ? (
                      <ArrowUpCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span className={`font-bold ${signal.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                      {signal.type}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {format(new Date(signal.time), 'HH:mm')}
                  </span>
                </div>
                
                {params && (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div className="bg-slate-800/50 rounded p-2">
                        <div className="text-slate-500 mb-0.5">Entry</div>
                        <div className="text-white font-mono">{formatCurrency(params.entry)}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-2">
                        <div className="text-slate-500 mb-0.5 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> SL
                        </div>
                        <div className="text-red-400 font-mono">{formatCurrency(params.stopLoss)}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-2">
                        <div className="text-slate-500 mb-0.5 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Target
                        </div>
                        <div className="text-green-400 font-mono">{formatCurrency(params.target)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="px-2 py-1 bg-slate-800/30 rounded">
                        <span className="text-slate-500">R:R </span>
                        <span className="text-green-400 font-semibold">1:{params.riskReward}</span>
                      </div>
                      <div className="px-2 py-1 bg-slate-800/30 rounded flex items-center justify-between">
                        <span className="text-slate-500">Conf. </span>
                        <Badge 
                          variant="outline"
                          className={`text-xs h-5 ${signal.confidence === 'HIGH' 
                            ? 'bg-green-600/20 text-green-400 border-green-500' 
                            : 'bg-blue-600/20 text-blue-400 border-blue-500'}`}
                        >
                          {signal.confidence}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
                
                <p className="text-xs text-slate-400 mb-2 line-clamp-2">{signal.reason}</p>
                
                {isLatest && canTrade && !tradingBlocked && !activeTrade && params && (
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecuteTrade(signal, params);
                    }}
                    className={`w-full ${
                      signal.type === 'BUY' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                    size="sm"
                  >
                    Execute {signal.type} @ {formatCurrency(params.entry)}
                  </Button>
                )}
                
                {isLatest && activeTrade && (
                  <Badge variant="outline" className="w-full justify-center text-amber-400 border-amber-400">
                    Active trade in progress
                  </Badge>
                )}
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}