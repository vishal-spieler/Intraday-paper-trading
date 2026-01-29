import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function SymbolSelector({ 
  selectedSymbol, 
  onSelectSymbol, 
  symbolData,
  isWithinTradingHours 
}) {
  const symbols = ['NIFTY', 'BANKNIFTY'];
  
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        {symbols.map(symbol => {
          const data = symbolData[symbol];
          const isSelected = selectedSymbol === symbol;
          const priceChange = data?.priceChange || 0;
          
          return (
            <Button
              key={symbol}
              variant={isSelected ? "default" : "outline"}
              onClick={() => onSelectSymbol(symbol)}
              className={`${
                isSelected 
                  ? 'bg-slate-700 border-slate-600' 
                  : 'bg-slate-900 border-slate-700 hover:bg-slate-800'
              } text-white`}
            >
              <span className="font-semibold mr-2">{symbol}</span>
              {data?.lastPrice && (
                <span className="font-mono text-sm">{data.lastPrice.toFixed(2)}</span>
              )}
              {priceChange !== 0 && (
                <span className={`ml-2 text-xs flex items-center ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {Math.abs(priceChange).toFixed(2)}%
                </span>
              )}
            </Button>
          );
        })}
      </div>
      
      <Badge 
        variant="outline" 
        className={`${isWithinTradingHours ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}`}
      >
        <Clock className="w-3 h-3 mr-1" />
        {isWithinTradingHours ? 'Market Open' : 'Market Closed'}
      </Badge>
    </div>
  );
}