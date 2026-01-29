
import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function CandlestickChart({
  candles,
  vwap,
  ema9,
  ema20,
  signals,
  symbol,
  activeTrade,
  trades = [],
  highlightedSignalTime
}) {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [tooltip, setTooltip] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState(null);
  const [hoveredCandle, setHoveredCandle] = useState(null);

  useEffect(() => {
    console.log('Chart Debug: candles:', candles.length, 'vwap:', vwap.length);
  }, [candles, vwap]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current?.parentElement) {
        const parent = canvasRef.current.parentElement;
        setDimensions({
          width: parent.clientWidth - 20,
          height: Math.min(400, window.innerHeight * 0.4)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !candles.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Set canvas size
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Calculate price range
    const padding = { top: 20, right: 70, bottom: 40, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Apply zoom and pan
    const visibleCandleCount = Math.ceil(candles.length / zoom);
    const startIndex = Math.max(0, Math.min(
      candles.length - visibleCandleCount,
      Math.floor(-panOffset.x / ((chartWidth / visibleCandleCount)))
    ));
    const endIndex = Math.min(candles.length, startIndex + visibleCandleCount);
    const visibleCandles = candles.slice(startIndex, endIndex);

    const allPrices = visibleCandles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...allPrices) * 0.998;
    const maxPrice = Math.max(...allPrices) * 1.002;
    const priceRange = maxPrice - minPrice;

    // Apply vertical pan
    const verticalPanAdjustment = (panOffset.y / chartHeight) * priceRange;
    const adjustedMinPrice = minPrice - verticalPanAdjustment;
    const adjustedMaxPrice = maxPrice - verticalPanAdjustment;
    const adjustedPriceRange = adjustedMaxPrice - adjustedMinPrice;

    // Price to Y coordinate
    const priceToY = (price) => {
      return padding.top + chartHeight - ((price - adjustedMinPrice) / adjustedPriceRange) * chartHeight;
    };

    // Index to X coordinate (relative to visible candles)
    const candleWidth = Math.max(2, (chartWidth / visibleCandles.length) * 0.7);
    const gap = (chartWidth / visibleCandles.length) * 0.3;
    const indexToX = (i) => {
      return padding.left + (i * (candleWidth + gap)) + gap / 2;
    };

    // Draw grid lines and price scale
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels on right scale
      const price = adjustedMaxPrice - (adjustedPriceRange / 5) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(1), width - padding.right + 5, y + 4);
    }

    // Draw price scale background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(width - padding.right, 0, padding.right, height);

    // Draw time scale background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, height - padding.bottom, width, padding.bottom);

    // Draw VWAP for visible candles
    if (vwap.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      visibleCandles.forEach((candle, i) => {
        const globalIndex = startIndex + i;
        if (vwap[globalIndex]) {
          const x = indexToX(i) + candleWidth / 2;
          const y = priceToY(vwap[globalIndex].value);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw EMA 9 for visible candles
    if (ema9.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      let started = false;
      visibleCandles.forEach((candle, i) => {
        const globalIndex = startIndex + i;
        const emaIndex = globalIndex - (candles.length - ema9.length);
        if (emaIndex >= 0 && ema9[emaIndex]) {
          const x = indexToX(i) + candleWidth / 2;
          const y = priceToY(ema9[emaIndex].value);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // Draw EMA 20 for visible candles
    if (ema20.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      let started = false;
      visibleCandles.forEach((candle, i) => {
        const globalIndex = startIndex + i;
        const emaIndex = globalIndex - (candles.length - ema20.length);
        if (emaIndex >= 0 && ema20[emaIndex]) {
          const x = indexToX(i) + candleWidth / 2;
          const y = priceToY(ema20[emaIndex].value);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // Draw visible candles
    visibleCandles.forEach((candle, i) => {
      const x = indexToX(i);
      const isGreen = candle.close >= candle.open;
      const isHovered = hoveredCandle && candle.time === hoveredCandle.time;
      const isHighlighted = highlightedSignalTime && candle.time === highlightedSignalTime;

      // Highlight hovered or selected candle
      if (isHovered || isHighlighted) {
        ctx.fillStyle = isHighlighted ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(x - gap / 2, padding.top, candleWidth + gap, chartHeight);
      }

      // Wick
      ctx.strokeStyle = (isHovered || isHighlighted) ? (isHighlighted ? '#a855f7' : '#60a5fa') : (isGreen ? '#22c55e' : '#ef4444');
      ctx.lineWidth = (isHovered || isHighlighted) ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, priceToY(candle.high));
      ctx.lineTo(x + candleWidth / 2, priceToY(candle.low));
      ctx.stroke();

      // Body
      ctx.fillStyle = (isHovered || isHighlighted) ? (isHighlighted ? '#a855f7' : '#60a5fa') : (isGreen ? '#22c55e' : '#ef4444');
      const bodyTop = priceToY(Math.max(candle.open, candle.close));
      const bodyHeight = Math.max(1, Math.abs(priceToY(candle.open) - priceToY(candle.close)));
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
    });

    // Draw trade visualizations
    const allTradesToVisualize = [...trades];
    if (activeTrade) allTradesToVisualize.push(activeTrade);

    allTradesToVisualize.forEach(trade => {
      const entryTime = new Date(trade.entry_time).getTime();
      const exitTime = trade.exit_time ? new Date(trade.exit_time).getTime() : null;

      // Find entry and exit candle indices in visible range
      let entryIndex = -1;
      let exitIndex = -1;

      visibleCandles.forEach((candle, i) => {
        const candleTime = new Date(candle.time).getTime();
        if (Math.abs(candleTime - entryTime) < 5 * 60 * 1000) { // Within 5 minutes
          entryIndex = i;
        }
        if (exitTime && Math.abs(candleTime - exitTime) < 5 * 60 * 1000) {
          exitIndex = i;
        }
      });

      // Draw shaded risk-reward box
      if (entryIndex >= 0) {
        const isBuy = trade.type === 'BUY';
        const slY = priceToY(trade.stop_loss);
        const targetY = priceToY(trade.target);
        const boxHeight = Math.abs(slY - targetY);
        const boxTop = Math.min(slY, targetY);

        ctx.fillStyle = isBuy ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)';
        ctx.fillRect(padding.left, boxTop, chartWidth, boxHeight);
      }

      // Draw horizontal lines (Entry, SL, Target)
      const isActive = trade.status === 'ACTIVE';

      // Entry line (blue)
      ctx.strokeStyle = isActive ? '#3b82f6' : 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.setLineDash(isActive ? [] : [5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, priceToY(trade.entry_price));
      ctx.lineTo(width - padding.right, priceToY(trade.entry_price));
      ctx.stroke();
      ctx.setLineDash([]);

      // Stop Loss line (red)
      ctx.strokeStyle = isActive ? '#ef4444' : 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.setLineDash(isActive ? [] : [5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, priceToY(trade.stop_loss));
      ctx.lineTo(width - padding.right, priceToY(trade.stop_loss));
      ctx.stroke();
      ctx.setLineDash([]);

      // Target line (green)
      ctx.strokeStyle = isActive ? '#22c55e' : 'rgba(34, 197, 94, 0.5)';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.setLineDash(isActive ? [] : [5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, priceToY(trade.target));
      ctx.lineTo(width - padding.right, priceToY(trade.target));
      ctx.stroke();
      ctx.setLineDash([]);

      // Entry marker with label
      if (entryIndex >= 0) {
        const x = indexToX(entryIndex) + candleWidth / 2;
        const y = priceToY(trade.entry_price);

        // Entry circle
        ctx.fillStyle = isActive ? '#3b82f6' : 'rgba(59, 130, 246, 0.7)';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Entry label
        const labelText = trade.type;
        ctx.font = 'bold 11px monospace';
        const textWidth = ctx.measureText(labelText).width;
        const labelX = x - textWidth / 2 - 4;
        const labelY = trade.type === 'BUY' ? y + 20 : y - 20;

        ctx.fillStyle = trade.type === 'BUY' ? '#22c55e' : '#ef4444';
        ctx.fillRect(labelX, labelY - 10, textWidth + 8, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, labelX + 4, labelY + 2);
      }

      // Exit marker
      if (exitIndex >= 0) {
        const x = indexToX(exitIndex) + candleWidth / 2;
        const exitY = priceToY(trade.exit_price);

        // Exit circle
        ctx.fillStyle = trade.pnl >= 0 ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(x, exitY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Exit X mark
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 3, exitY - 3);
        ctx.lineTo(x + 3, exitY + 3);
        ctx.moveTo(x + 3, exitY - 3);
        ctx.lineTo(x - 3, exitY + 3);
        ctx.stroke();
      }
    });

    // Draw signals for visible candles
    signals.forEach(signal => {
      if (signal.index >= startIndex && signal.index < endIndex) {
        const relativeIndex = signal.index - startIndex;
        const x = indexToX(relativeIndex) + candleWidth / 2;
        const y = signal.type === 'BUY'
          ? priceToY(signal.candle.low) + 15
          : priceToY(signal.candle.high) - 15;

        ctx.beginPath();
        if (signal.type === 'BUY') {
          ctx.fillStyle = '#22c55e';
          ctx.moveTo(x, y - 10);
          ctx.lineTo(x - 6, y);
          ctx.lineTo(x + 6, y);
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.moveTo(x, y + 10);
          ctx.lineTo(x - 6, y);
          ctx.lineTo(x + 6, y);
        }
        ctx.closePath();
        ctx.fill();
      }
    });

    // Volume bars at bottom for visible candles
    const maxVolume = Math.max(...visibleCandles.map(c => c.volume));
    const volumeHeight = 25;

    visibleCandles.forEach((candle, i) => {
      const x = indexToX(i);
      const isGreen = candle.close >= candle.open;
      const barHeight = (candle.volume / maxVolume) * volumeHeight;

      ctx.fillStyle = isGreen ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(x, height - padding.bottom + 5, candleWidth, barHeight);
    });

    // Draw time labels
    const timeStep = Math.max(1, Math.floor(visibleCandles.length / 6));
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    visibleCandles.forEach((candle, i) => {
      if (i % timeStep === 0) {
        const x = indexToX(i) + candleWidth / 2;
        const time = new Date(candle.time);
        const timeStr = time.getHours().toString().padStart(2, '0') + ':' +
          time.getMinutes().toString().padStart(2, '0');
        ctx.fillText(timeStr, x, height - 5);
      }
    });

    // Draw crosshair and update hovered candle
    if (mousePos) {
      const { x: mouseX, y: mouseY } = mousePos;

      // Find nearest candle
      const candleIndex = Math.floor((mouseX - padding.left) / (candleWidth + gap));
      if (candleIndex >= 0 && candleIndex < visibleCandles.length) {
        const candle = visibleCandles[candleIndex];
        const candleX = indexToX(candleIndex) + candleWidth / 2;

        // Update hovered candle state
        if (!hoveredCandle || hoveredCandle.time !== candle.time) {
          setHoveredCandle(candle);
        }

        // Draw crosshair
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(candleX, padding.top);
        ctx.lineTo(candleX, height - padding.bottom);
        ctx.stroke();

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(padding.left, mouseY);
        ctx.lineTo(width - padding.right, mouseY);
        ctx.stroke();

        ctx.setLineDash([]);

        // Draw price label on right scale
        const priceAtMouse = adjustedMinPrice + ((height - padding.bottom - mouseY) / chartHeight) * adjustedPriceRange;
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(width - padding.right, mouseY - 10, padding.right, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(priceAtMouse.toFixed(2), width - padding.right / 2, mouseY + 4);
      }
    } else {
      setHoveredCandle(null);
    }

  }, [candles, vwap, ema9, ema20, signals, dimensions, zoom, panOffset, mousePos, hoveredCandle, activeTrade, trades, highlightedSignalTime]);

  const displayCandle = hoveredCandle || candles[candles.length - 1];
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const priceChange = lastCandle && prevCandle
    ? ((lastCandle.close - prevCandle.close) / prevCandle.close * 100).toFixed(2)
    : 0;

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-white text-lg">{symbol}</CardTitle>
            {lastCandle && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">
                  {lastCandle.close.toFixed(2)}
                </span>
                <Badge
                  variant="outline"
                  className={`${parseFloat(priceChange) >= 0 ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}`}
                >
                  {parseFloat(priceChange) >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {priceChange}%
                </Badge>
              </div>
            )}
          </div>
          {displayCandle && (
            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-1.5 border border-slate-700">
              <div className="text-xs">
                <span className="text-slate-400 mr-1">Time:</span>
                <span className="text-white font-mono">
                  {new Date(displayCandle.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-slate-400 mr-1">O:</span>
                <span className="text-white font-mono">{displayCandle.open.toFixed(2)}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-400 mr-1">H:</span>
                <span className="text-green-400 font-mono">{displayCandle.high.toFixed(2)}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-400 mr-1">L:</span>
                <span className="text-red-400 font-mono">{displayCandle.low.toFixed(2)}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-400 mr-1">C:</span>
                <span className={`font-mono ${displayCandle.close >= displayCandle.open ? 'text-green-400' : 'text-red-400'}`}>
                  {displayCandle.close.toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-amber-500"></div>
              <span className="text-slate-400">VWAP</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span className="text-slate-400">EMA 9</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-purple-500"></div>
              <span className="text-slate-400">EMA 20</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <canvas
          ref={canvasRef}
          style={{ width: dimensions.width, height: dimensions.height, cursor: isDragging ? 'grabbing' : 'crosshair' }}
          className="rounded"
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(prev => Math.max(0.5, Math.min(5, prev * delta)));
          }}
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
          }}
          onMouseMove={(e) => {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setMousePos({ x, y });

            if (isDragging) {
              setPanOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
              });
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => {
            setIsDragging(false);
            setMousePos(null);
          }}
        />
        <div className="flex items-center justify-between mt-1 text-slate-500 text-xs">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>5-Minute Candles</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Zoom: {zoom.toFixed(1)}x</span>
            {zoom !== 1 && (
              <button
                onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
                className="text-blue-400 hover:text-blue-300"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
